"""Image-level fracture classification using a pretrained HF vision model.

YOLO is kept for localization only. This classifier provides the image-level
second opinion, which is safer than treating detector "Not_Fracture" boxes as
proof that the whole scan is normal.
"""

from __future__ import annotations

import logging
from PIL import Image

logger = logging.getLogger(__name__)

_processor = None
_model = None


def _get_model():
    """Load the fracture classifier and processor lazily."""
    global _processor, _model
    if _model is None:
        logger.info("Loading pretrained fracture classifier...")
        try:
            from transformers import AutoImageProcessor, AutoModelForImageClassification
            from app.config import get_settings

            model_name = get_settings().fracture_classifier_model_name
            try:
                _processor = AutoImageProcessor.from_pretrained(model_name)
            except Exception:
                from transformers import AutoProcessor

                _processor = AutoProcessor.from_pretrained(model_name)
            _model = AutoModelForImageClassification.from_pretrained(model_name)
            _model.eval()
            logger.info(f"Fracture classifier loaded: {model_name}")
        except Exception as exc:
            logger.error(f"Failed to load fracture classifier: {exc}")
            raise
    return _processor, _model


def predict_fracture_presence(image: Image.Image) -> list[dict]:
    """Classify whether the full image likely contains a fracture."""
    import torch

    processor, model = _get_model()
    inputs = processor(images=image.convert("RGB"), return_tensors="pt")

    with torch.no_grad():
        outputs = model(**inputs)
        probs = torch.nn.functional.softmax(outputs.logits, dim=-1)[0]

    id2label = model.config.id2label
    ranked = sorted(
        ((float(probs[i]) * 100, str(id2label[int(i)])) for i in range(len(probs))),
        reverse=True,
    )
    top_conf, top_label = ranked[0]
    top_key = _normalize_label(top_label)

    if _is_fracture_label(top_key):
        return [{
            "name": "Unconfirmed fracture signal (image classifier)",
            "confidence": round(top_conf, 1),
            "severity": "unconfirmed",
            "model": "FractureClassifier",
            "region": "Full image",
            "icd_code": "",
            "color": "warning",
        }]

    return [{
        "name": "No fracture suspected by classifier",
        "confidence": round(top_conf, 1),
        "severity": "unconfirmed",
        "model": "FractureClassifier",
        "region": "Full image",
        "icd_code": "",
        "color": "warning",
    }]


def _normalize_label(label: str) -> str:
    return label.lower().replace("-", "_").replace(" ", "_")


def _is_fracture_label(label: str) -> bool:
    if any(token in label for token in ("not", "normal", "negative", "no_fracture", "nofracture")):
        return False
    return "fracture" in label or "fractured" in label or label in {"positive", "label_1", "1"}
