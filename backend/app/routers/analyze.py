"""Image analysis endpoint: the core AI inference pipeline."""

import asyncio
import logging
import time
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile, status

from app.config import get_settings
from app.main import limiter
from app.models.schemas import AgentSynthesis, BoundingBox, Finding, ScanResult
from app.services import image_preprocess
from app.services.auth_service import get_current_user_id
from app.services.openrouter_agent import synthesize_report
from app.utils.supabase_client import insert_scan, upload_image

logger = logging.getLogger(__name__)
router = APIRouter(tags=["analyze"])


@router.post("/analyze", response_model=ScanResult)
@limiter.limit("10/minute")
async def analyze_image(
    request: Request,
    file: UploadFile = File(...),
    scan_type: str = Form(...),
    session_label: str = Form(default=""),
    bone_area: str = Form(default=""),
    notes: str = Form(default=""),
    user_id: str = Depends(get_current_user_id),
):
    """Upload an image and run the routed diagnostic ensemble."""
    settings = get_settings()

    if scan_type not in ("chest", "fracture", "wound", "auto"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="scan_type must be one of: auto, chest, fracture, wound",
        )

    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Empty file uploaded.")

    try:
        image_preprocess.validate_image_file(
            file_bytes,
            filename=file.filename or "",
            content_type=file.content_type or "",
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc

    # ── Auto-detect scan type if user selected "auto" ────────────────
    original_scan_type = scan_type
    routing: dict = {
        "requested": original_scan_type,
        "detected": scan_type,
        "ambiguous": False,
        "cross_checked": None,
        "switched": False,
        "note": None,
    }
    if scan_type == "auto":
        from app.services.image_router import classify_image_detailed
        try:
            details = await asyncio.to_thread(classify_image_detailed, file_bytes)
        except Exception as exc:
            logger.exception("Image modality router failed")
            raise HTTPException(status_code=503, detail="Automatic image routing is unavailable. Select the image category manually.") from exc
        if details["ambiguous"]:
            raise HTTPException(status_code=422, detail="Image category is uncertain or unsupported. Select Bone/Fracture, Chest or Wound manually and use a clear image.")
        scan_type = details["scan_type"]
        routing.update(details)
        routing["detected"] = scan_type
        routing["note"] = "The image category was matched independently of disease scores. Check the selected category before interpreting the result."

    if scan_type == "fracture" and bone_area not in ("wrist", "general"):
        raise HTTPException(status_code=422, detail="This is a bone X-ray. Select Wrist or Other bones in Bone area before analysis; automatic body-part selection is not reliable enough.")

    scan_id = str(uuid.uuid4())
    logger.info(f"Starting analysis {scan_id} | type={scan_type} (requested={original_scan_type}) | user={user_id}")
    start_time = time.perf_counter()

    try:
        primary_result = await _run_routed_ensemble(
            file_bytes=file_bytes, scan_type=scan_type,
            confidence_threshold=settings.confidence_threshold,
            bone_area=bone_area,
        )
        raw_findings, model_errors, model_names = primary_result
    except Exception as exc:
        logger.error(f"Model inference failed: {exc}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"AI model inference failed: {str(exc)}",
        ) from exc

    if scan_type == "fracture" and not any(f.get("bbox") for f in raw_findings):
        routing["note"] = (routing.get("note") or "") + " " + (
            "No fracture was localized at the selected threshold. This does not rule out a fracture; "
            "a radiologist should review the original X-ray."
        )
    routing["final"] = scan_type

    try:
        agent_result = synthesize_report(
            findings=raw_findings,
            scan_type=scan_type,
            patient_notes=notes if notes else None,
        )
    except Exception as exc:
        logger.error(f"OpenRouter synthesis failed: {exc}")
        agent_result = {
            "urgency": "review" if scan_type == "fracture" else "medium",
            "synthesis_text": "AI synthesis temporarily unavailable. Please review findings manually.",
            "recommended_actions": ["Consult a radiologist for interpretation"],
            "specialist": None,
        }

    image_url = ""
    try:
        image_url = upload_image(user_id, scan_id, file_bytes, file.content_type or "image/png")
    except Exception as exc:
        logger.warning(f"Image upload failed (non-blocking): {exc}")

    findings = [
        Finding(
            name=f["name"],
            confidence=f["confidence"],
            severity=f["severity"],
            model=f["model"],
            region=f.get("region"),
            icd_code=f.get("icd_code"),
            bbox=BoundingBox(**f["bbox"]) if f.get("bbox") else None,
            color=f.get("color", "info"),
        )
        for f in raw_findings
    ]

    synthesis = AgentSynthesis(
        urgency=agent_result["urgency"],
        synthesis_text=agent_result["synthesis_text"],
        recommended_actions=agent_result.get("recommended_actions", []),
        specialist=agent_result.get("specialist"),
    )

    processing_time_ms = int((time.perf_counter() - start_time) * 1000)

    model_results = {
        "assessment_version": "2026-10-02-negative-reporting",
        "assessment_status": ({"clear": "no_fracture_detected", "high": "fracture_suspected"}.get(synthesis.urgency, "review_recommended")) if scan_type == "fracture" else "not_applicable",
        "bone_area": bone_area if scan_type == "fracture" else None,
        "confidence_interpretation": "Model scores are not calibrated diagnostic probabilities or measures of injury severity.",
        "localization_status": ("localized_suspicion" if any(f.get("bbox") for f in raw_findings) else "inconclusive") if scan_type == "fracture" else "not_applicable",
        "scan_type": scan_type,
        "auto_detected": original_scan_type == "auto",
        "ensemble_mode": "routed",
        "routing": routing,
        "models_run": model_names,
        "model_errors": model_errors,
        "specialist": synthesis.specialist,  # persisted here since scans table has no specialist column
        "processing_time_ms": processing_time_ms,
    }

    try:
        scan_record = {
            "id": scan_id,
            "user_id": user_id,
            "scan_type": scan_type,
            "session_label": session_label or None,
            "notes": notes or None,
            "image_url": image_url,
            "urgency": synthesis.urgency,
            "findings": [f.model_dump() for f in findings],
            "agent_synthesis": synthesis.synthesis_text,
            "agent_actions": synthesis.recommended_actions,
            "model_results": model_results,
        }
        insert_scan(scan_record)
    except Exception as exc:
        logger.warning(f"Database insert failed (non-blocking): {exc}")

    result = ScanResult(
        id=scan_id,
        scan_type=scan_type,
        session_label=session_label or None,
        image_url=image_url,
        urgency=synthesis.urgency,
        findings=findings,
        agent_synthesis=synthesis,
        model_results=model_results,
        created_at=datetime.now(timezone.utc).isoformat(),
    )

    logger.info(f"Analysis {scan_id} complete | findings={len(findings)} | urgency={synthesis.urgency}")
    return result


async def _run_routed_ensemble(
    *,
    file_bytes: bytes,
    scan_type: str,
    confidence_threshold: float,
    bone_area: str = "general",
) -> tuple[list[dict], list[dict], list[str]]:
    """Run applicable models in parallel.

    Chest and fracture X-rays run DenseNet121 plus fracture YOLO as a cross-check.
    External wound photos route to the wound classifier only.
    """
    tasks: list[tuple[str, asyncio.Task[list[dict]]]] = []

    # Strict routing — each scan type uses only its relevant model(s)
    # chest    → DenseNet121 only  (YOLO on chest produces irrelevant fracture labels)
    # fracture → selected YOLO profile plus optional fracture classifier       (DenseNet121 is chest-only; on an extremity X-ray it
    #                               emits nonsensical chest pathologies like "Pneumonia")
    # wound    → ViT only
    # DenseNet121 is multi-label (18 independent sigmoids); on diffuse pathology many
    # correlated labels cluster near their decision boundary. Raise the bar to 60% and
    # cap the count so the report surfaces only meaningful findings, not the full list.
    CHEST_THRESHOLD    = max(confidence_threshold, 0.60)   # raise bar for chest: 60%
    FRACTURE_THRESHOLD = get_settings().fracture_confidence_threshold
    MAX_CHEST_FINDINGS = 6

    if scan_type == "chest":
        tasks.append(("DenseNet121", asyncio.create_task(
            asyncio.to_thread(_run_chest, file_bytes, CHEST_THRESHOLD))))
    elif scan_type == "fracture":
        tasks.append((f"{get_settings().yolo_model_name}-Fracture", asyncio.create_task(
            asyncio.to_thread(_run_fracture, file_bytes, FRACTURE_THRESHOLD, bone_area))))
    else:  # wound
        tasks.append(("WoundClassifier", asyncio.create_task(
            asyncio.to_thread(_run_wound, file_bytes, confidence_threshold))))

    raw_findings: list[dict] = []
    model_errors: list[dict] = []
    model_names = [name for name, _ in tasks]
    results = await asyncio.gather(*(task for _, task in tasks), return_exceptions=True)

    for (name, _), result in zip(tasks, results):
        if isinstance(result, Exception):
            logger.warning(f"{name} inference failed during ensemble: {result}")
            model_errors.append({"model": name, "error": str(result)})
            continue
        # Cap the multi-label DenseNet output so a wall of near-threshold
        # chest pathologies doesn't bury the clinically relevant findings.
        if name == "DenseNet121":
            result = sorted(result, key=lambda f: f.get("confidence", 0), reverse=True)[:MAX_CHEST_FINDINGS]
        raw_findings.extend(result)

    if not raw_findings and model_errors:
        error_text = "; ".join(f"{e['model']}: {e['error']}" for e in model_errors)
        raise RuntimeError(error_text)

    raw_findings.sort(key=lambda f: f.get("confidence", 0), reverse=True)
    if scan_type == "fracture":
        model_names = list(dict.fromkeys(f.get("model", "Fracture detector") for f in raw_findings))
    return raw_findings, model_errors, model_names


def _run_chest(file_bytes: bytes, confidence_threshold: float) -> list[dict]:
    from app.services.chest_model import predict_chest_pathologies

    preprocessed = image_preprocess.preprocess_for_chest(file_bytes)
    return predict_chest_pathologies(preprocessed, confidence_threshold)


_INACTIVE_FRACTURE_WORDS = ("prior", "healed", "old finding", "no fracture", "not fracture")


def _is_active_fracture(finding: dict) -> bool:
    name = finding.get("name", "").lower()
    return "fracture" in name and not any(w in name for w in _INACTIVE_FRACTURE_WORDS)


def _run_fracture(file_bytes: bytes, confidence_threshold: float, bone_area: str = "general") -> list[dict]:
    """Keep localization and the unchanged classifier's second opinion independent.

    Bright pixels, an implant, or classifier disagreement cannot establish healing.
    The image-level classifier never creates a fabricated bounding box.
    """
    from app.services.fracture_model import predict_fractures

    image = image_preprocess.load_image_from_bytes(file_bytes)
    yolo_findings = predict_fractures(image, confidence_threshold, profile=bone_area)
    findings = [dict(f) for f in yolo_findings if f.get("bbox")]
    has_box = bool(findings)
    if get_settings().fracture_classifier_enabled:
        try:
            from app.services.fracture_classifier import predict_fracture_presence
            from PIL import Image
            import cv2
            classifier_findings = predict_fracture_presence(Image.fromarray(cv2.cvtColor(image, cv2.COLOR_BGR2RGB)))
            for finding in classifier_findings:
                if has_box and _is_active_fracture(finding):
                    continue
                findings.append(dict(finding))
        except Exception as exc:
            logger.warning("Fracture classifier failed: %s", exc)
    if not has_box:
        findings.extend(yolo_findings)
    return sorted(findings, key=lambda item: item.get("confidence", 0), reverse=True)


def _run_wound(file_bytes: bytes, confidence_threshold: float) -> list[dict]:
    from app.services.wound_model import predict_wound

    preprocessed = image_preprocess.preprocess_for_vit(file_bytes)
    return predict_wound(preprocessed, confidence_threshold)
