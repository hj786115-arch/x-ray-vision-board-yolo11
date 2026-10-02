"""Agentic reasoning engine using OpenRouter GLM 4.5 Air.

Synthesizes outputs from all specialized models into a unified,
clinically actionable diagnostic report with urgency classification.
"""

from __future__ import annotations
import json
import logging
from app.services.openrouter_client import complete_text

logger = logging.getLogger(__name__)


def synthesize_report(
    findings: list[dict],
    scan_type: str,
    patient_notes: str | None = None,
    image_base64: str | None = None,
) -> dict:
    """Generate an agentic synthesis report from model findings.

    Args:
        findings: List of findings from the vision models.
        scan_type: "chest", "fracture", or "wound".
        patient_notes: Optional notes from the clinician.
        image_base64: Optional base64-encoded image for multimodal analysis.

    Returns:
        Dict with urgency, synthesis_text, recommended_actions, specialist.
    """
    if scan_type == "fracture":
        from app.services.fracture_assessment import fracture_assessment
        return fracture_assessment(findings)

    prompt = _build_synthesis_prompt(findings, scan_type, patient_notes)

    try:
        # Without `reasoning: exclude`, GLM sometimes writes out its own chain
        # of thought (and even echoes back these instructions) before ever
        # producing the JSON — with a 1400-token budget that reasoning alone
        # can eat the whole response, so the JSON never appears and the user
        # sees the model's raw scratch space as the "clinical synthesis".
        # diet_service.py already had this fix; it just never got copied here.
        response_text = complete_text(
            prompt,
            temperature=0.1,
            max_tokens=1800,
            reasoning={"effort": "low", "exclude": True},
        )
        parsed = _parse_synthesis_response(response_text)

        # Double-check: if any finding has confidence > 70 but urgency is "clear", escalate
        high_conf_findings = [f for f in findings if f.get("confidence", 0) > 70
                              and f.get("severity") != "clear"]
        if high_conf_findings and parsed["urgency"] == "clear":
            parsed["urgency"] = "medium"
            parsed["synthesis_text"] += (
                " Note: High-confidence findings detected — "
                "radiologist review is recommended."
            )

        # The LLM doesn't always honor the >70% cardiac rule — validate its choice.
        parsed["specialist"] = _validate_specialist(
            parsed.get("specialist"), scan_type, findings
        )

        return parsed

    except Exception as e:
        logger.error(f"OpenRouter synthesis failed: {e}")
        # Fallback: generate a basic report from findings alone
        return _fallback_synthesis(findings, scan_type)


def _build_synthesis_prompt(
    findings: list[dict],
    scan_type: str,
    patient_notes: str | None,
) -> str:
    """Construct the structured prompt for the reasoning model."""

    findings_text = "\n".join(
        f"  - {f['name']}: {f['confidence']}% confidence, "
        f"severity={f.get('severity', 'unknown')}, "
        f"model={f.get('model', 'unknown')}, "
        f"region={f.get('region', 'unknown')}, "
        f"ICD-10={f.get('icd_code', 'N/A')}"
        for f in findings
    )

    notes_section = ""
    if patient_notes:
        notes_section = f"\n\nClinical Notes from Referring Physician:\n{patient_notes}"

    return f"""You are an expert AI radiology assistant integrated into the XRayVision AI system.
You are analyzing the output of specialized medical imaging models.

SCAN TYPE: {scan_type.upper()}

MODEL FINDINGS:
{findings_text}
{notes_section}

Based on these findings, provide a clinical synthesis report. You MUST respond in the following JSON format ONLY (no markdown, no extra text):

{{
  "urgency": "<one of: critical, high, medium, low, clear>",
  "synthesis_text": "<2-4 sentence clinical interpretation of the findings, written as a radiologist would. Reference specific findings, their clinical significance, and how they relate to each other.>",
  "recommended_actions": [
    "<action 1>",
    "<action 2>",
    "<action 3>",
    "<action 4>"
  ],
  "specialist": "<recommended specialist type, e.g., Cardiologist, Orthopedic Surgeon, Pulmonologist, or null if clear>"
}}

IMPORTANT RULES:
1. Be clinically precise. Reference the TOP 2-3 findings by confidence only. Ignore findings below 55% in your narrative.
2. If any finding has severity "high" or confidence > 80%, urgency should be at minimum "high".
3. If no significant pathology is detected, set urgency to "clear" and recommend routine follow-up.
4. Always include a recommendation to consult a qualified radiologist.
5. recommended_actions should be specific, actionable medical steps — max 4 actions.
10. For fracture scans: if findings indicate "Prior Fracture Site", "Surgical Implants Present", or "Healed Fracture Site", set urgency to "low" or "medium" and clarify that post-surgical internal fixation hardware (plates/screws) is present from a prior injury without active dislocation.
11. "No fracture box localized" means YOLO did not find a box; it is not proof of no fracture.
8. For specialist: choose based ONLY on the highest-confidence finding (>60%).
   - Lung Opacity / Infiltration / Pneumonia / Atelectasis / Consolidation / Edema → Pulmonologist
   - Cardiomegaly / Enlarged Cardiomediastinum (only if >70% confidence) → Cardiologist
   - Fracture / Bone anomaly → Orthopedic Surgeon
   - Effusion / Pneumothorax → Pulmonologist or Thoracic Surgeon
   - Wound / Laceration → General Surgeon
   - If unclear, default to Pulmonologist for chest scans.
7. This is for educational use — include appropriate disclaimers in your synthesis.
"""


class _SynthesisRefused(RuntimeError):
    """The model returned a safety-refusal / moderation verdict instead of a synthesis."""


# Seen live: some OpenRouter free-tier models/fallbacks occasionally return a
# bare moderation verdict ("User Safety: unsafe Safety Categories: ...")
# instead of the requested JSON — not a conversational refusal, just a
# classifier's label. Since this never parses as JSON, it used to fall
# through to the raw-text fallback below and get shown to the user as the
# "clinical synthesis" verbatim. Treat it as a failure instead, so
# synthesize_report()'s except-branch produces the deterministic fallback.
_REFUSAL_MARKERS = (
    "safety categories", "unauthorized advice", "i cannot provide",
    "i can't provide", "i am unable to", "i'm unable to", "cannot assist",
    "can't assist", "against my guidelines", "content policy",
)


def _looks_like_refusal(text: str) -> bool:
    lowered = text.lower()
    return len(text) < 300 and any(marker in lowered for marker in _REFUSAL_MARKERS)


def _parse_synthesis_response(response_text: str) -> dict:
    """Parse the model response into a structured dict."""
    text = response_text.strip()

    if _looks_like_refusal(text):
        raise _SynthesisRefused(f"Model returned a refusal/moderation verdict: {text[:200]!r}")

    # Remove markdown code fences if present
    if text.startswith("```"):
        lines = text.split("\n")
        text = "\n".join(lines[1:-1] if lines[-1].strip() == "```" else lines[1:])
        text = text.strip()

    parsed = _try_json_parse(text)
    if parsed is None:
        start = text.find("{")
        end = text.rfind("}")
        if start != -1 and end != -1 and end > start:
            parsed = _try_json_parse(text[start:end + 1])

    if isinstance(parsed, str):
        parsed = _try_json_parse(parsed)

    if isinstance(parsed, dict):
        return {
            "urgency": parsed.get("urgency", "medium"),
            "synthesis_text": parsed.get("synthesis_text", ""),
            "recommended_actions": parsed.get("recommended_actions", []),
            "specialist": parsed.get("specialist"),
        }

    logger.warning("Failed to parse OpenRouter JSON response, using raw text.")
    return {
        "urgency": "medium",
        "synthesis_text": text[:500],
        "recommended_actions": [
            "Consult a qualified radiologist for definitive interpretation",
            "Correlate with clinical symptoms and patient history",
            "Consider additional imaging if findings are inconclusive",
        ],
        "specialist": None,
    }


def _try_json_parse(text: str):
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        return None


def _fallback_synthesis(findings: list[dict], scan_type: str) -> dict:
    """Generate a basic synthesis when OpenRouter is unavailable."""
    if scan_type == "fracture":
        from app.services.fracture_assessment import fracture_assessment
        return fracture_assessment(findings)

    if not findings or all(f.get("severity") == "clear" for f in findings):
        return {
            "urgency": "clear",
            "synthesis_text": (
                "No significant pathology detected in the submitted image. "
                "The AI models did not identify findings exceeding the confidence threshold. "
                "Routine follow-up is recommended."
            ),
            "recommended_actions": [
                "No immediate action required",
                "Continue routine screening schedule",
                "Consult radiologist if symptoms persist",
            ],
            "specialist": None,
        }

    # Sort findings by confidence
    sorted_findings = sorted(findings, key=lambda f: f.get("confidence", 0), reverse=True)
    top = sorted_findings[0]

    urgency = "high" if top["confidence"] > 70 else "medium" if top["confidence"] > 50 else "low"

    names = ", ".join(f["name"] for f in sorted_findings[:3])
    synthesis = (
        f"AI models detected the following findings: {names}. "
        f"The highest confidence finding is {top['name']} at {top['confidence']}%. "
        f"Please consult a qualified radiologist for definitive diagnosis."
    )

    return {
        "urgency": urgency,
        "synthesis_text": synthesis,
        "recommended_actions": [
            "Seek radiologist consultation for definitive interpretation",
            f"Consider {top.get('region', 'targeted')} imaging follow-up",
            "Correlate with clinical symptoms and patient history",
            "Do not dismiss findings — clinical verification required",
        ],
        "specialist": _suggest_specialist(scan_type, sorted_findings),
    }


def _validate_specialist(
    specialist: str | None, scan_type: str, findings: list[dict]
) -> str | None:
    """Override an unjustified specialist recommendation from the LLM.

    Cardiologist is only appropriate for a chest scan when a cardiac finding
    (Cardiomegaly / Enlarged Cardiomediastinum) exceeds 70% confidence — the
    same rule given in the prompt. The LLM doesn't always follow it, so we
    fall back to the deterministic suggestion when it doesn't.
    """
    if not specialist:
        return specialist

    if scan_type == "chest" and "cardiolog" in specialist.lower():
        cardiac = {"Cardiomegaly", "Enlarged Cardiomediastinum"}
        has_cardiac = any(
            f.get("name") in cardiac and f.get("confidence", 0) >= 70
            for f in findings
        )
        if not has_cardiac:
            return _suggest_specialist(scan_type, findings)

    return specialist


def _suggest_specialist(scan_type: str, findings: list[dict]) -> str | None:
    """Suggest a specialist based on the highest-confidence finding."""
    if scan_type == "fracture":
        has_positive = any(
            "fracture" in f.get("name", "").lower()
            and "no fracture" not in f.get("name", "").lower()
            for f in findings
        )
        return "Orthopedic Surgeon" if has_positive else None
    if scan_type == "wound":
        return "General Surgeon"

    if scan_type == "chest":
        # Only recommend Cardiologist if cardiac findings are high-confidence
        cardiac = {"Cardiomegaly", "Enlarged Cardiomediastinum"}
        for f in findings:
            if f["name"] in cardiac and f.get("confidence", 0) >= 70:
                return "Cardiologist"
        # Default to Pulmonologist for all other chest pathologies
        return "Pulmonologist"

    return None
