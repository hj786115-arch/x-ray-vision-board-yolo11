"""Centralized application settings loaded from environment variables."""

import logging
import os
from functools import lru_cache

from pydantic import Field
from pydantic.aliases import AliasChoices
from pydantic_settings import BaseSettings, SettingsConfigDict

logger = logging.getLogger(__name__)


class Settings(BaseSettings):
    # Supabase
    # Accepts both SUPABASE_KEY and SUPABASE_SERVICE_ROLE_KEY so either
    # naming convention works in Render / HuggingFace Spaces env vars.
    supabase_url: str = "https://your-project.supabase.co"
    supabase_key: str = Field(
        "your-supabase-service-role-key",
        validation_alias=AliasChoices("SUPABASE_KEY", "SUPABASE_SERVICE_ROLE_KEY"),
    )
    supabase_anon_key: str = "your-supabase-anon-key"

    # OpenRouter
    openrouter_api_key: str = ""
    openrouter_model: str = "z-ai/glm-4.5-air:free"
    # Free model IDs get rate limited and retired without warning, which used to
    # take the chatbot and diet planner offline. These are tried in order when
    # the primary model fails. `openrouter/free` is OpenRouter's auto-router
    # across whatever free models are currently healthy.
    # Only 2 entries here: OpenRouter caps the whole chain (primary + these)
    # at 3 and 400s the request if it is longer. `openrouter/free` goes last
    # because it auto-routes across whatever free models are currently healthy.
    openrouter_fallback_models: str = (
        "meta-llama/llama-3.3-70b-instruct:free,"
        "openrouter/free"
    )
    openrouter_site_url: str = "http://localhost:5173"
    openrouter_app_name: str = "XRayVision AI"
    openrouter_timeout_seconds: float = 60.0

    # Hugging Face
    hf_token: str | None = None

    # JWT
    jwt_secret: str = "change-this-to-a-random-secret-string"
    jwt_algorithm: str = "HS256"
    jwt_expiry_hours: int = 24

    # Additional allowed CORS origins for production (comma-separated)
    # Example: ALLOWED_ORIGINS=https://myapp.vercel.app,https://myapp.com
    allowed_origins: str = ""

    # Model Config
    yolo_weights_path: str = "models/fracture_yolo11.onnx"
    yolo_model_name: str = "YOLO11"
    yolo_image_size: int = 640
    fracture_confidence_threshold: float = 0.40
    allow_generic_yolo_weights: bool = False
    # Set FRACTURE_CLASSIFIER_ENABLED=false on low-RAM hosts (saves ~400 MB).
    fracture_classifier_enabled: bool = True
    fracture_classifier_model_name: str = "prithivMLmods/Bone-Fracture-Detection"
    wound_model_name: str = "PayamFard123/dermaintel-wound-classifier"
    confidence_threshold: float = 0.40

    # CORS
    frontend_url: str = "http://localhost:5173"

    # Performance — set DISABLE_PRELOAD=true on free-tier hosts (<=512 MB RAM)
    # to avoid OOM on startup. Models will lazy-load on first use instead.
    disable_preload: bool = False

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        populate_by_name=True,
    )


_INSECURE_JWT_DEFAULT = "change-this-to-a-random-secret-string"


@lru_cache()
def get_settings() -> Settings:
    settings = Settings()

    # Block startup if the JWT secret was never changed from the insecure default
    if settings.jwt_secret == _INSECURE_JWT_DEFAULT:
        logger.critical(
            "\n\n"
            "  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
            "  🔴  FATAL: JWT_SECRET is still the insecure default!\n"
            "  Generate a real secret and set it in your .env file:\n"
            "    python -c \"import secrets; print(secrets.token_hex(32))\"\n"
            "  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
        )
        raise SystemExit("JWT_SECRET must be changed from the default value.")

    if settings.hf_token:
        os.environ.setdefault("HF_TOKEN", settings.hf_token)
        os.environ.setdefault("HUGGINGFACE_HUB_TOKEN", settings.hf_token)
    return settings
