"""Image-modality routing independent of disease-classifier scores.

CLIP matches image content to anatomy/photo descriptions; it does not diagnose.
Uncertain or unsupported input asks the user to select a category explicitly.
"""
from __future__ import annotations
import threading
import torch
from PIL import Image
import cv2

MODEL_ID = "openai/clip-vit-base-patch32"
MODEL_REVISION = "3d74acf9a28c67741b2f4f2ea7635f0aaf6f0268"
PROMPTS = [
    "an X-ray of a shoulder", "an X-ray of a hand and wrist",
    "an X-ray of an arm and elbow", "an X-ray of a leg",
    "an X-ray of a foot", "an X-ray of a hip",
    "a frontal chest X-ray showing two lungs",
    "a photo of a skin wound", "a photo of normal skin",
    "a photograph of a room or object",
]
_model = _processor = None
_lock = threading.Lock()


def _get_model():
    global _model, _processor
    if _model is None:
        with _lock:
            if _model is None:
                from transformers import CLIPModel, CLIPProcessor
                processor = CLIPProcessor.from_pretrained(MODEL_ID, revision=MODEL_REVISION)
                model = CLIPModel.from_pretrained(MODEL_ID, revision=MODEL_REVISION).eval()
                _processor, _model = processor, model
    return _model, _processor


def route_from_logits(logits) -> dict:
    # Max per family prevents six anatomy prompts from receiving six votes.
    grouped = torch.stack((logits[:6].max(), logits[6], logits[7:9].max(), logits[9]))
    scores = grouped.softmax(-1).tolist()
    ordered = sorted(range(4), key=lambda i: scores[i], reverse=True)
    winner, runner_up = ordered[:2]
    types = ("fracture", "chest", "wound", "unsupported")
    ambiguous = winner == 3 or scores[winner] < 0.70 or scores[winner] - scores[runner_up] < 0.20
    return {
        "scan_type": types[winner], "ambiguous": ambiguous,
        "routing_scores": dict(zip(types, [round(s, 4) for s in scores])),
        "method": "CLIP image-modality matching", "model_revision": MODEL_REVISION,
        "score_note": "Relative prompt-matching scores, not diagnostic probabilities.",
    }


def classify_image_detailed(file_bytes: bytes) -> dict:
    from app.services.image_preprocess import load_image_from_bytes
    image = Image.fromarray(cv2.cvtColor(load_image_from_bytes(file_bytes), cv2.COLOR_BGR2RGB))
    model, processor = _get_model()
    with torch.inference_mode():
        logits = model(**processor(text=PROMPTS, images=image, return_tensors="pt", padding=True)).logits_per_image[0]
    return route_from_logits(logits)


def classify_image_type(file_bytes: bytes) -> str:
    details = classify_image_detailed(file_bytes)
    if details["ambiguous"]:
        raise ValueError("Image category is uncertain. Please select Bone/Fracture, Chest or Wound manually.")
    return details["scan_type"]
