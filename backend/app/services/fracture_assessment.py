"""Interpret detection evidence without converting model scores into severity.

These are review priorities for an educational prototype, not clinical triage.
An absent box is never evidence that an injury is safe or that a fracture is absent.
"""
from __future__ import annotations


def fracture_assessment(findings: list[dict]) -> dict:
    boxes = [f for f in findings if f.get("bbox") and "fracture" in f.get("name", "").lower() and not any(word in f.get("name", "").lower() for word in ("no fracture", "not fracture", "healed"))]
    classifier = [f for f in findings if f.get("model") == "FractureClassifier"]
    if boxes:
        locations = ", ".join(dict.fromkeys(f.get("region") or "highlighted region" for f in boxes))
        text = (
            f"The detector marked {len(boxes)} region(s) suspicious for fracture: {locations}. "
            "The boxes show model-predicted locations, not a confirmed diagnosis. "
            "The selected detector has limited research validation and may miss fractures or mark normal structures. "
            "Prompt radiologist or orthopedic review is recommended. "
            "Model confidence does not measure injury severity or displacement."
        )
        if any("no fracture" in f.get("name", "").lower() for f in classifier):
            text += " The image classifier disagrees; this does not cancel the localized finding."
        return {
            "urgency": "high",
            "synthesis_text": text,
            "recommended_actions": [
                "Arrange prompt clinical review of the highlighted regions and original X-ray.",
                "A clinician must assess symptoms, alignment, displacement and injury severity.",
                "Additional views or imaging may be needed if the clinical concern persists.",
            ],
            "specialist": "Orthopedic Surgeon",
        }
    positive = any("unconfirmed" in f.get("name", "").lower() or f.get("name") == "Fracture suspected" for f in classifier)
    text = "No fracture location was identified by the detector. The selected detector has limited research validation. "
    if positive:
        text += "The image classifier raised an unconfirmed fracture signal, but it cannot identify its location. "
    text += (
        "This result is inconclusive: a missed or subtle fracture remains possible. "
        "It does not establish that the X-ray is normal, that an internal injury is absent, "
        "or that the injury is minor. Clinical urgency cannot be determined from these model scores."
    )
    return {
        "urgency": "review",
        "synthesis_text": text,
        "recommended_actions": [
            "Have a qualified clinician review the original image and the patient's symptoms.",
            "Do not use a missing box or a classifier score to rule out a fracture.",
            "If symptoms or injury mechanism are concerning, seek clinical assessment without waiting for an AI result.",
        ],
        "specialist": "Orthopedic Surgeon",
    }
