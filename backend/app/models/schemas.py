"""Pydantic schemas for all API request and response models."""

from __future__ import annotations
from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime


# ── Auth ──────────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    email: str = Field(..., examples=["alex@hospital.org"])
    password: str = Field(..., min_length=8)
    full_name: str = Field(..., examples=["Dr. Alex Reyes"])
    role: str = Field(default="Medical Student")


class LoginRequest(BaseModel):
    email: str
    password: str


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserProfile


class UserProfile(BaseModel):
    id: str
    email: str
    full_name: str
    role: str
    avatar_url: Optional[str] = None
    settings: dict = {}
    created_at: Optional[str] = None


class ProfileUpdateRequest(BaseModel):
    full_name: Optional[str] = None
    role: Optional[str] = None
    avatar_url: Optional[str] = None


class SettingsUpdateRequest(BaseModel):
    settings: dict


# ── Analysis ──────────────────────────────────────────────────────────

class AnalyzeRequest(BaseModel):
    scan_type: str = Field(..., pattern="^(auto|chest|fracture|wound)$")
    session_label: Optional[str] = None
    notes: Optional[str] = None


class BoundingBox(BaseModel):
    x: float
    y: float
    w: float
    h: float


class Finding(BaseModel):
    name: str
    confidence: float
    severity: str  # "critical", "high", "moderate", "low"
    model: str
    region: Optional[str] = None
    icd_code: Optional[str] = None
    bbox: Optional[BoundingBox] = None
    color: str = "info"  # "destructive", "warning", "info"


class AgentSynthesis(BaseModel):
    urgency: str  # "critical", "high", "medium", "low", "clear"
    synthesis_text: str
    recommended_actions: list[str] = []
    specialist: Optional[str] = None


class ScanResult(BaseModel):
    id: str
    scan_type: str
    session_label: Optional[str] = None
    image_url: str
    urgency: str
    findings: list[Finding]
    agent_synthesis: AgentSynthesis
    model_results: dict = {}
    created_at: str


class ScanListItem(BaseModel):
    id: str
    scan_type: str
    session_label: Optional[str] = None
    image_url: str
    urgency: str
    findings_count: int
    created_at: str


class ScanListResponse(BaseModel):
    scans: list[ScanListItem]
    total: int


# ── Chat ──────────────────────────────────────────────────────────────

class ChatMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str
    created_at: Optional[str] = None


class ChatRequest(BaseModel):
    session_id: Optional[str] = None
    message: str
    language: str = "en"  # "en" or "ur"


class ChatResponse(BaseModel):
    session_id: str
    reply: str
    doctor_type: Optional[str] = None
    home_remedies: list[str] = []
    # False when the AI service could not be reached; `error` carries the reason
    # so the UI can show it instead of silently pretending the bot replied.
    ok: bool = True
    error: Optional[str] = None
    mode: str = "online_ai"
    notice: Optional[str] = None
    sources: list[str] = []


class ChatSession(BaseModel):
    id: str
    title: Optional[str] = None
    created_at: str


# ── Diet ──────────────────────────────────────────────────────────────

class DietRequest(BaseModel):
    condition: Optional[str] = None
    dietary_preferences: str = "balanced"
    restrictions: list[str] = []
    goals: str = "general health"
    language: str = "en"


class MealItem(BaseModel):
    name: str
    description: str
    calories: Optional[int] = None
    nutrients: Optional[str] = None


class DayPlan(BaseModel):
    day: str
    breakfast: MealItem
    lunch: MealItem
    dinner: MealItem
    snacks: list[MealItem] = []


class DietPlanResponse(BaseModel):
    title: str
    summary: str
    plan: list[DayPlan]
    tips: list[str] = []


# ── Dashboard Stats ──────────────────────────────────────────────────

class ModelPerformance(BaseModel):
    name: str
    task: str
    auc: float
    color: str


class DashboardStats(BaseModel):
    total_scans: int
    critical_findings: int
    avg_confidence: float
    avg_report_time: float
    recent_scans: list[ScanListItem]
    finding_distribution: dict[str, int]
    model_performance: list[ModelPerformance]


# ── Clinic Locator ───────────────────────────────────────────────────

class ClinicResult(BaseModel):
    name: str
    type: str
    address: str
    lat: float
    lon: float
    distance_km: float
    maps_url: str


class ClinicSearchResponse(BaseModel):
    clinics: list[ClinicResult]
    total: int
    search_location: dict
