"""Scan history CRUD endpoints."""

from __future__ import annotations
from io import BytesIO
from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import Response
from app.models.schemas import ScanResult, ScanListItem, ScanListResponse, Finding, AgentSynthesis, BoundingBox
from app.services.auth_service import get_current_user_id
from app.utils.supabase_client import get_user_scans, get_scan_by_id, delete_scan

router = APIRouter(prefix="/scans", tags=["scans"])


@router.get("", response_model=ScanListResponse)
async def list_scans(
    scan_type: str | None = Query(default=None),
    limit: int = Query(default=50, le=100),
    offset: int = Query(default=0, ge=0),
    user_id: str = Depends(get_current_user_id),
):
    """List all scans for the authenticated user."""
    scans, total = get_user_scans(user_id, scan_type=scan_type, limit=limit, offset=offset)

    items = []
    for s in scans:
        findings = s.get("findings", [])
        items.append(ScanListItem(
            id=s["id"],
            scan_type=s["scan_type"],
            session_label=s.get("session_label"),
            image_url=s.get("image_url", ""),
            urgency=s.get("urgency", "clear"),
            findings_count=len(findings) if isinstance(findings, list) else 0,
            created_at=s.get("created_at", ""),
        ))

    return ScanListResponse(scans=items, total=total)


@router.get("/{scan_id}", response_model=ScanResult)
async def get_scan(
    scan_id: str,
    user_id: str = Depends(get_current_user_id),
):
    """Get a single scan with full results."""
    scan = get_scan_by_id(scan_id, user_id)
    if not scan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Scan not found.",
        )

    # Parse findings
    raw_findings = scan.get("findings", [])
    findings = []
    for f in raw_findings:
        bbox = None
        if f.get("bbox"):
            bbox = BoundingBox(**f["bbox"])
        findings.append(Finding(
            name=f.get("name", "Unknown"),
            confidence=f.get("confidence", 0),
            severity=f.get("severity", "low"),
            model=f.get("model", "Unknown"),
            region=f.get("region"),
            icd_code=f.get("icd_code"),
            bbox=bbox,
            color=f.get("color", "info"),
        ))

    # Parse agent synthesis; specialist is stored in model_results.
    agent_actions = scan.get("agent_actions", [])
    raw_model_results = scan.get("model_results") or {}
    specialist = raw_model_results.get("specialist") if isinstance(raw_model_results, dict) else None
    synthesis = AgentSynthesis(
        urgency=scan.get("urgency", "clear"),
        synthesis_text=scan.get("agent_synthesis", ""),
        recommended_actions=agent_actions if isinstance(agent_actions, list) else [],
        specialist=specialist,
    )

    return ScanResult(
        id=scan["id"],
        scan_type=scan["scan_type"],
        session_label=scan.get("session_label"),
        image_url=scan.get("image_url", ""),
        urgency=scan.get("urgency", "clear"),
        findings=findings,
        agent_synthesis=synthesis,
        model_results=scan.get("model_results", {}),
        created_at=scan.get("created_at", ""),
    )


@router.delete("/{scan_id}")
async def remove_scan(
    scan_id: str,
    user_id: str = Depends(get_current_user_id),
):
    """Delete a scan."""
    deleted = delete_scan(scan_id, user_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Scan not found or already deleted.",
        )
    return {"message": "Scan deleted successfully."}


@router.get("/{scan_id}/export.json")
async def export_scan_json(
    scan_id: str,
    user_id: str = Depends(get_current_user_id),
):
    """Export a scan report as JSON."""
    scan = get_scan_by_id(scan_id, user_id)
    if not scan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Scan not found.")
    return scan


@router.get("/{scan_id}/report.pdf")
async def export_scan_pdf(
    scan_id: str,
    user_id: str = Depends(get_current_user_id),
):
    """Export a scan report as a PDF."""
    scan = get_scan_by_id(scan_id, user_id)
    if not scan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Scan not found.")

    try:
        pdf_bytes = _build_scan_pdf(scan)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"PDF generation failed: {str(exc)}",
        ) from exc

    filename = f"xrayvision-report-{scan_id}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


def _build_scan_pdf(scan: dict) -> bytes:
    from xml.sax.saxutils import escape
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import mm
    from reportlab.lib.enums import TA_CENTER, TA_LEFT
    from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle, HRFlowable
    from reportlab.pdfgen import canvas as pdfcanvas

    PAGE_W, PAGE_H = A4
    BRAND_DARK = colors.HexColor("#0f172a")
    BRAND_CYAN = colors.HexColor("#0284c7")
    BRAND_TEAL = colors.HexColor("#0891b2")
    BRAND_LIGHT = colors.HexColor("#e2e8f0")
    TEXT = colors.HexColor("#111827")
    MUTED = colors.HexColor("#64748b")
    PANEL = colors.HexColor("#f8fafc")
    SEV_HIGH = colors.HexColor("#dc2626")
    SEV_MED = colors.HexColor("#d97706")
    SEV_LOW = colors.HexColor("#2563eb")
    SEV_CLEAR = colors.HexColor("#059669")

    urgency_color_map = {
        "critical": SEV_HIGH,
        "high": SEV_HIGH,
        "medium": SEV_MED,
        "review": SEV_MED,
        "low": SEV_LOW,
        "clear": SEV_CLEAR,
    }
    sev_color_map = {
        "critical": SEV_HIGH,
        "high": SEV_HIGH,
        "moderate": SEV_MED,
        "suspected": SEV_MED,
        "unconfirmed": SEV_MED,
        "inconclusive": SEV_MED,
        "low": SEV_LOW,
        "clear": SEV_CLEAR,
    }

    def text(value, fallback="-"):
        if value is None or value == "":
            return fallback
        return escape(str(value))

    def upper(value, fallback="-"):
        return text(value, fallback).upper()

    def pct(value):
        try:
            return f"{float(value):.1f}%"
        except (TypeError, ValueError):
            return "-"

    def hex_color(color):
        return color.hexval()[2:]

    buffer = BytesIO()

    def _on_page(canv: pdfcanvas.Canvas, doc):
        canv.saveState()
        try:
            canv.setFillAlpha(0.055)
        except Exception:
            pass
        canv.setFont("Helvetica-Bold", 44)
        canv.setFillColor(colors.HexColor("#64748b"))
        canv.translate(PAGE_W / 2, PAGE_H / 2)
        canv.rotate(35)
        canv.drawCentredString(0, 0, "EDUCATIONAL USE ONLY")
        canv.restoreState()

        canv.saveState()
        canv.setFillColor(BRAND_DARK)
        canv.rect(0, PAGE_H - 20 * mm, PAGE_W, 20 * mm, fill=1, stroke=0)
        canv.setFillColor(BRAND_TEAL)
        canv.rect(0, PAGE_H - 20 * mm, PAGE_W, 1.2 * mm, fill=1, stroke=0)
        canv.setFont("Helvetica-Bold", 14)
        canv.setFillColor(colors.white)
        canv.drawString(16 * mm, PAGE_H - 10.5 * mm, "XRayVision AI")
        canv.setFont("Helvetica", 8)
        canv.setFillColor(colors.HexColor("#cbd5e1"))
        canv.drawString(16 * mm, PAGE_H - 15.4 * mm, "AI-assisted radiology report | Educational platform")
        canv.setFont("Helvetica-Bold", 7)
        canv.setFillColor(colors.white)
        canv.drawRightString(PAGE_W - 16 * mm, PAGE_H - 10.2 * mm, "DIAGNOSTIC REPORT")
        canv.setFont("Helvetica", 7)
        canv.setFillColor(colors.HexColor("#cbd5e1"))
        canv.drawRightString(PAGE_W - 16 * mm, PAGE_H - 15.2 * mm, f"Scan ID: {str(scan.get('id', ''))[:12].upper()}")

        canv.setFillColor(BRAND_DARK)
        canv.rect(0, 0, PAGE_W, 12 * mm, fill=1, stroke=0)
        canv.setFont("Helvetica", 7)
        canv.setFillColor(colors.HexColor("#94a3b8"))
        canv.drawString(16 * mm, 4.3 * mm, "AI-generated educational output. Not a medical device or clinical diagnosis.")
        canv.setFillColor(colors.white)
        canv.drawRightString(PAGE_W - 16 * mm, 4.3 * mm, f"Page {doc.page}")
        canv.restoreState()

    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=16 * mm,
        rightMargin=16 * mm,
        topMargin=27 * mm,
        bottomMargin=18 * mm,
        title=f"XRayVision AI Report - {scan.get('id', '')}",
        author="XRayVision AI v2.1",
        subject="AI Diagnostic Report",
        creator="XRayVision AI - Educational Platform",
    )

    base = getSampleStyleSheet()

    def st(name, parent="Normal", **kw):
        return ParagraphStyle(name, parent=base[parent], **kw)

    S = {
        "title": st("title", "Title", fontName="Helvetica-Bold", fontSize=18, leading=22, textColor=BRAND_DARK, alignment=TA_LEFT, spaceAfter=3),
        "subtitle": st("sub", "Normal", fontSize=8.5, textColor=MUTED, leading=11, spaceAfter=8),
        "section": st("section", "Heading2", fontName="Helvetica-Bold", fontSize=11.5, textColor=BRAND_DARK, spaceBefore=12, spaceAfter=5),
        "body": st("body", "Normal", fontSize=8.4, textColor=TEXT, leading=12.5),
        "body_small": st("bodySmall", "Normal", fontSize=7.7, textColor=TEXT, leading=10.5),
        "label": st("label", "Normal", fontName="Helvetica-Bold", fontSize=7.2, textColor=MUTED, leading=9),
        "mono": st("mono", "Normal", fontSize=7.2, textColor=colors.HexColor("#334155"), fontName="Courier", leading=9.4),
        "disc": st("disc", "Normal", fontSize=7.2, textColor=colors.HexColor("#64748b"), leading=10, spaceAfter=4),
        "num": st("num", "Normal", fontName="Helvetica-Bold", fontSize=8, textColor=colors.white, alignment=TA_CENTER, leading=10),
    }

    story = []
    findings = scan.get("findings") or []
    urgency = str(scan.get("urgency", "clear") or "clear").lower()
    urg_color = urgency_color_map.get(urgency, SEV_LOW)
    created_at = str(scan.get("created_at", ""))[:19].replace("T", "  ")
    specialist = (scan.get("model_results") or {}).get("specialist")
    scan_type = str(scan.get("scan_type", "-") or "-").upper()
    result_label = (
        "No fracture detected by AI" if scan_type == "FRACTURE" and urgency == "clear"
        else "Uncertain result - review recommended" if scan_type == "FRACTURE" and urgency == "review"
        else "Inconclusive - review required" if urgency == "review" else urgency
    )

    story.append(Paragraph("Diagnostic Report", S["title"]))
    story.append(Paragraph(f"Generated by XRayVision AI multi-model workflow | {text(created_at)}", S["subtitle"]))
    story.append(HRFlowable(width="100%", thickness=1.2, color=BRAND_TEAL, spaceAfter=8))

    summary_data = [[
        Paragraph("AI RESULT" if scan_type == "FRACTURE" and urgency == "clear" else "REVIEW PRIORITY", S["label"]),
        Paragraph("SCAN TYPE", S["label"]),
        Paragraph("FINDINGS", S["label"]),
        Paragraph("GENERATED", S["label"]),
    ], [
        Paragraph(f'<font color="#{hex_color(urg_color)}"><b>{upper(result_label)}</b></font>', S["body"]),
        Paragraph(text(scan_type), S["body"]),
        Paragraph(str(len(findings)), S["body"]),
        Paragraph(text(created_at), S["body_small"]),
    ]]
    story.append(Table(summary_data, colWidths=[38 * mm, 37 * mm, 30 * mm, 72 * mm], style=TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), PANEL),
        ("BOX", (0, 0), (-1, -1), 0.6, BRAND_LIGHT),
        ("LINEABOVE", (0, 0), (-1, 0), 2.0, urg_color),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
    ])))
    story.append(Spacer(1, 8))

    meta = [
        [Paragraph("Scan ID", S["label"]), Paragraph(text(scan.get("id")), S["mono"])],
        [Paragraph("Session", S["label"]), Paragraph(text(scan.get("session_label")), S["body"])],
        [Paragraph("Patient Notes", S["label"]), Paragraph(text(scan.get("notes")), S["body"])],
    ]
    story.append(Table(meta, colWidths=[34 * mm, 143 * mm], style=TableStyle([
        ("BACKGROUND", (0, 0), (0, -1), PANEL),
        ("BACKGROUND", (1, 0), (1, -1), colors.white),
        ("GRID", (0, 0), (-1, -1), 0.35, BRAND_LIGHT),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
    ])))
    story.append(Spacer(1, 10))

    story.append(Paragraph("AI Model Findings", S["section"]))
    story.append(HRFlowable(width="100%", thickness=0.5, color=BRAND_LIGHT, spaceAfter=6))

    rows = [[
        Paragraph("<b>MODEL</b>", S["mono"]),
        Paragraph("<b>FINDING</b>", S["mono"]),
        Paragraph("<b>SCORE</b>", S["mono"]),
        Paragraph("<b>STATUS</b>", S["mono"]),
        Paragraph("<b>REGION</b>", S["mono"]),
        Paragraph("<b>ICD-10</b>", S["mono"]),
    ]]
    row_styles = [
        ("BACKGROUND", (0, 0), (-1, 0), BRAND_DARK),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("GRID", (0, 0), (-1, -1), 0.3, BRAND_LIGHT),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
    ]

    if not findings:
        rows.append([
            Paragraph("-", S["mono"]),
            Paragraph("No high-confidence findings reported.", S["body"]),
            Paragraph("-", S["mono"]),
            Paragraph("-", S["mono"]),
            Paragraph("-", S["mono"]),
            Paragraph("-", S["mono"]),
        ])
    else:
        for i, finding in enumerate(findings):
            sev = str(finding.get("severity", "low") or "low").lower()
            sev_color = sev_color_map.get(sev, SEV_LOW)
            rows.append([
                Paragraph(text(finding.get("model")), S["mono"]),
                Paragraph(f"<b>{text(finding.get('name'))}</b>", S["body"]),
                Paragraph(pct(finding.get("confidence")), S["mono"]),
                Paragraph(f'<font color="#{hex_color(sev_color)}"><b>{upper(sev)}</b></font>', S["body_small"]),
                Paragraph(text(finding.get("region")), S["body_small"]),
                Paragraph(text(finding.get("icd_code")), S["mono"]),
            ])
            bg = colors.HexColor("#f9fafb") if i % 2 == 0 else colors.white
            row_styles.append(("BACKGROUND", (0, i + 1), (-1, i + 1), bg))

    story.append(Table(rows, colWidths=[24 * mm, 58 * mm, 18 * mm, 24 * mm, 34 * mm, 19 * mm], style=TableStyle(row_styles), repeatRows=1))
    story.append(Spacer(1, 10))

    synthesis = scan.get("agent_synthesis") or "No synthesis available."
    story.append(Paragraph("AI Agent Synthesis", S["section"]))
    story.append(HRFlowable(width="100%", thickness=0.5, color=BRAND_LIGHT, spaceAfter=6))
    story.append(Table([[Paragraph(text(synthesis), S["body"])]], colWidths=[177 * mm], style=TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f0f9ff")),
        ("BOX", (0, 0), (-1, -1), 0.7, colors.HexColor("#7dd3fc")),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
    ])))
    story.append(Spacer(1, 8))

    actions = scan.get("agent_actions") or []
    if actions:
        story.append(Paragraph("Recommended Actions", S["section"]))
        story.append(HRFlowable(width="100%", thickness=0.5, color=BRAND_LIGHT, spaceAfter=6))
        action_rows = [[Paragraph(f"<b>{i + 1}</b>", S["num"]), Paragraph(text(action), S["body"])] for i, action in enumerate(actions)]
        story.append(Table(action_rows, colWidths=[9 * mm, 168 * mm], style=TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("BACKGROUND", (0, 0), (0, -1), BRAND_CYAN),
            ("BOX", (0, 0), (-1, -1), 0.3, BRAND_LIGHT),
            ("INNERGRID", (0, 0), (-1, -1), 0.3, BRAND_LIGHT),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ("LEFTPADDING", (0, 0), (-1, -1), 6),
            ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ])))
        story.append(Spacer(1, 6))

    if specialist:
        story.append(Table([[Paragraph("Recommended Specialist", S["label"]), Paragraph(f"<b>{text(specialist)}</b>", S["body"])]], colWidths=[48 * mm, 129 * mm], style=TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#ecfeff")),
            ("BOX", (0, 0), (-1, -1), 0.6, colors.HexColor("#67e8f9")),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("TOPPADDING", (0, 0), (-1, -1), 7),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ])))

    story.append(Spacer(1, 12))
    story.append(HRFlowable(width="100%", thickness=0.5, color=BRAND_LIGHT, spaceAfter=6))
    story.append(Paragraph(
        "<b>DISCLAIMER:</b> This report is produced by XRayVision AI, an educational AI diagnostic tool. "
        "It is NOT a substitute for evaluation by a licensed radiologist or qualified medical professional. "
        "All findings are AI-estimated probabilities and must be correlated with clinical history. "
        "In case of emergency, contact your local medical services immediately.",
        S["disc"],
    ))
    story.append(Paragraph(
        "XRayVision AI | FYP - Minhaj University Lahore | BSSE 8th Semester | May 2026",
        ParagraphStyle("brand", parent=S["disc"], alignment=TA_CENTER, textColor=colors.HexColor("#9ca3af")),
    ))

    doc.build(story, onFirstPage=_on_page, onLaterPages=_on_page)
    return buffer.getvalue()
