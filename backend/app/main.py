"""XRayVision AI — FastAPI Application Entry Point.

Initializes the FastAPI app with CORS, model preloading, and all routers.
"""

from __future__ import annotations
import logging
import threading
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from app.config import get_settings

# Rate limiter — keyed by client IP address
limiter = Limiter(key_func=get_remote_address, default_limits=["200/minute"])

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-7s | %(name)s | %(message)s",
)
logger = logging.getLogger("xrayvision")


def _preload_models_background():
    """Load AI models in a background thread so the server starts immediately."""
    logger.info("📦 Preloading AI models in background thread...")

    try:
        from app.services.chest_model import _get_model as load_chest
        load_chest()
        logger.info("✅ DenseNet121 (Chest Pathology) loaded")
    except Exception as e:
        logger.warning(f"⚠️ DenseNet121 failed to preload: {e}")

    try:
        from app.services.fracture_model import _get_model as load_fracture
        load_fracture()
        logger.info("✅ YOLO11 (Fracture Detection) loaded")
    except Exception as e:
        logger.warning(f"⚠️ YOLO11 failed to preload: {e}")

    try:
        if get_settings().fracture_classifier_enabled:
            from app.services.fracture_classifier import _get_model as load_fracture_classifier
            load_fracture_classifier()
            logger.info("HF Fracture Classifier loaded")
    except Exception as e:
        logger.warning(f"HF Fracture Classifier failed to preload: {e}")

    try:
        from app.services.wound_model import _get_model as load_wound
        load_wound()
        logger.info("✅ ViT (Wound Classification) loaded")
    except Exception as e:
        logger.warning(f"⚠️ ViT failed to preload: {e}")

    logger.info("🟢 All AI models loaded and ready!")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Start model loading in background — server is ready immediately."""
    logger.info("🚀 XRayVision AI backend starting...")

    settings = get_settings()
    if settings.disable_preload:
        # On free-tier hosts (<=512 MB RAM) skip preloading entirely.
        # Models will lazy-load on first use so auth/chat/diet work immediately.
        logger.info("⏭️  DISABLE_PRELOAD=true — models will load on first use")
    else:
        # Full preload on capable hosts (HuggingFace Spaces, Render Standard+)
        thread = threading.Thread(target=_preload_models_background, daemon=True)
        thread.start()

    logger.info("🟢 XRayVision AI is accepting requests! (models loading in background)")
    yield
    logger.info("🔴 XRayVision AI shutting down...")


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""
    settings = get_settings()

    app = FastAPI(
        title="XRayVision AI",
        description=(
            "Advanced medical diagnostic API using a Hybrid Multi-Model Ensemble. "
            "DenseNet121 for chest pathology, YOLO11 for fracture detection, "
            "ViT for wound classification, and OpenRouter GLM 4.5 Air for agentic synthesis."
        ),
        version="2.1.0",
        lifespan=lifespan,
        docs_url="/docs",
        redoc_url="/redoc",
    )

    # Rate limiter
    app.state.limiter = limiter
    app.add_exception_handler(
        RateLimitExceeded,
        lambda request, exc: JSONResponse(
            status_code=429,
            content={"detail": "Rate limit exceeded. Please slow down."},
        ),
    )

    # CORS — strict in production, relaxed in development
    allowed_origins: list[str] = [settings.frontend_url]

    # Add any extra production origins from ALLOWED_ORIGINS env var
    if settings.allowed_origins:
        allowed_origins.extend(
            origin.strip()
            for origin in settings.allowed_origins.split(",")
            if origin.strip()
        )

    # Only add localhost origins if frontend_url is also localhost (i.e. dev mode)
    if "localhost" in settings.frontend_url or "127.0.0.1" in settings.frontend_url:
        dev_origins = [
            "http://localhost:5173",
            "http://localhost:5174",
            "http://localhost:3000",
            "http://localhost:3001",
            "http://localhost:8080",
            "http://localhost:8081",
            "http://127.0.0.1:5173",
            "http://127.0.0.1:3000",
        ]
        for origin in dev_origins:
            if origin not in allowed_origins:
                allowed_origins.append(origin)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type", "Accept"],
    )

    # Register routers
    from app.routers import auth, analyze, scans, chat, diet, stats, clinics

    app.include_router(auth.router)
    app.include_router(analyze.router)
    app.include_router(scans.router)
    app.include_router(chat.router)
    app.include_router(diet.router)
    app.include_router(stats.router)
    app.include_router(clinics.router)

    @app.get("/", tags=["health"])
    async def health():
        return {
            "status": "healthy",
            "service": "XRayVision AI",
            "version": "2.1.0",
            "models": ["DenseNet121", "YOLO11", "ViT", "OpenRouter GLM 4.5 Air"],
        }

    @app.get("/health", tags=["health"])
    async def health_check():
        return {"status": "ok"}

    return app


app = create_app()
