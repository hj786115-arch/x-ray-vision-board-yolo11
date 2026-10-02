"""Dashboard statistics endpoint."""

from __future__ import annotations
from fastapi import APIRouter, Depends
from app.models.schemas import DashboardStats, ScanListItem, ModelPerformance
from app.services.auth_service import get_current_user_id
from app.utils.supabase_client import get_user_stats, get_user_scans

router = APIRouter(tags=["stats"])


@router.get("/stats", response_model=DashboardStats)
async def dashboard_stats(user_id: str = Depends(get_current_user_id)):
    """Get aggregated dashboard statistics for the current user."""
    stats = get_user_stats(user_id)
    recent_raw, _ = get_user_scans(user_id, limit=5)

    recent = [
        ScanListItem(
            id=s["id"],
            scan_type=s["scan_type"],
            session_label=s.get("session_label"),
            image_url=s.get("image_url", ""),
            urgency=s.get("urgency", "clear"),
            findings_count=len(s.get("findings", [])),
            created_at=s.get("created_at", ""),
        )
        for s in recent_raw
    ]

    confs = stats.get("model_confidences", {})
    model_perf = [
        ModelPerformance(name="DenseNet121", task="Chest Pathology", auc=confs.get("DenseNet121", 0.0) / 100.0, color="bg-primary"),
        ModelPerformance(name="Fracture YOLO", task="Fracture Detection", auc=0.0, color="bg-secondary"),
        ModelPerformance(name="ViT", task="Wound Classification", auc=confs.get("WoundClassifier", 0.0) / 100.0, color="bg-info"),
    ]

    total_confidences = sum(confs.values())
    avg_conf = (total_confidences / len(confs)) if confs else 0.0

    return DashboardStats(
        total_scans=stats["total_scans"],
        critical_findings=stats["critical_findings"],
        avg_confidence=round(avg_conf, 1),
        avg_report_time=stats["avg_report_time"],
        recent_scans=recent,
        finding_distribution=stats["finding_distribution"],
        model_performance=model_perf,
    )
