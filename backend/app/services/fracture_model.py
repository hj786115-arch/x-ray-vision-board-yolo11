"""Fracture-only YOLO detection, with boxes in original-image coordinates.

Profiles: multi-region fracture candidate and pediatric-wrist specialist.
Both checkpoints are pinned by revision and SHA256 in the download script.
Ultralytics handles letterboxing, NMS, and mapping xyxy back to the source image.
A score is model confidence, not fracture severity or clinical accuracy.
"""
from __future__ import annotations

import logging
from pathlib import Path
import os
import numpy as np

logger = logging.getLogger(__name__)
_models = {}


def _is_fracture_class(name: str) -> bool:
    key = name.strip().lower().replace("-", "_").replace(" ", "_")
    if any(word in key for word in ("not_", "no_", "normal", "negative", "healed")):
        return False
    return key in {"fracture", "fractured", "bone_fracture"} or key.endswith("_fracture")


def _get_model(profile: str = "general"):
    if profile not in _models:
        from ultralytics import YOLO
        import ultralytics.utils.torch_utils as torch_utils
        # Ultralytics otherwise overrides OMP_NUM_THREADS with eight threads,
        # oversubscribing the small free CPU service.
        torch_utils.NUM_THREADS = max(1, int(os.environ.get("OMP_NUM_THREADS", "2")))
        from app.config import get_settings

        settings = get_settings()
        weights = Path(settings.wrist_yolo_weights_path if profile == "wrist" else settings.yolo_weights_path)
        if not weights.is_file():
            raise FileNotFoundError(
                f"Fracture weights missing: {weights}. Run python download_fracture_model.py."
            )
        model = YOLO(str(weights), task="detect")
        # Validate the actual class metadata, not a filename that can be renamed.
        names = model.names
        if not any(_is_fracture_class(str(name)) for name in names.values()):
            raise ValueError("This detector has no fracture class. Use fracture-trained weights.")
        _models[profile] = model
        logger.info("Loaded %s fracture detector from %s", settings.wrist_yolo_model_name if profile == "wrist" else settings.yolo_model_name, weights)
    return _models[profile]


def _normalized_box(xyxy, width: int, height: int) -> dict | None:
    coords = np.asarray(xyxy, dtype=float)
    if coords.shape != (4,) or not np.isfinite(coords).all():
        return None
    x1, y1, x2, y2 = coords
    x1, x2 = np.clip([x1, x2], 0, width)
    y1, y2 = np.clip([y1, y2], 0, height)
    if x2 <= x1 or y2 <= y1:
        return None
    return {
        "x": float(x1 / width * 100), "y": float(y1 / height * 100),
        "w": float((x2 - x1) / width * 100),
        "h": float((y2 - y1) / height * 100),
    }


def predict_fractures(image: np.ndarray, confidence_threshold: float = 0.40, profile: str = "general") -> list[dict]:
    from app.config import get_settings

    settings = get_settings()
    model = _get_model(profile)
    model_name = settings.wrist_yolo_model_name if profile == "wrist" else settings.yolo_model_name
    names = model.names
    class_ids = [i for i, name in names.items() if _is_fracture_class(str(name))]
    # Keep the reviewed training resolution. Ultralytics reverses letterbox
    # padding and scaling before returning original-image boxes.
    results = model(
        image, conf=confidence_threshold, imgsz=settings.yolo_image_size,
        classes=class_ids, iou=0.45, verbose=False, device="cpu",
    )
    height, width = image.shape[:2]
    findings = []
    for result in results:
        if result.boxes is None:
            continue
        for box in result.boxes:
            name = str(result.names[int(box.cls[0].item())])
            score = float(box.conf[0].item())
            if not _is_fracture_class(name) or score < confidence_threshold:
                continue
            bbox = _normalized_box(box.xyxy[0].cpu().numpy(), width, height)
            if bbox is None:
                continue
            findings.append({
                "name": "Fracture suspected", "confidence": round(score * 100, 1),
                "severity": "suspected", "model": model_name,
                "region": "Localized region", "icd_code": "", "bbox": bbox,
                "color": "warning",
            })
    findings.sort(key=lambda finding: finding["confidence"], reverse=True)
    if not findings:
        findings.append({
            "name": "No fracture box localized", "confidence": 0.0,
            "severity": "inconclusive", "model": model_name,
            "region": "Full image", "icd_code": "", "color": "warning",
        })
    return findings
