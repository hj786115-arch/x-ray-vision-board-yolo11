/**
 * TypeScript interfaces matching the backend Pydantic schemas.
 */

// ── Auth ──────────────────────────────────────────────────────────
export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: string;
  avatar_url?: string | null;
  settings?: Record<string, unknown>;
  created_at?: string | null;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: UserProfile;
}

// ── Analysis ──────────────────────────────────────────────────────
export interface BoundingBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Finding {
  name: string;
  confidence: number;
  severity: string;
  model: string;
  region?: string | null;
  icd_code?: string | null;
  bbox?: BoundingBox | null;
  color: string;
}

export interface AgentSynthesis {
  urgency: string;
  synthesis_text: string;
  recommended_actions: string[];
  specialist?: string | null;
}

export interface ScanResult {
  id: string;
  scan_type: string;
  session_label?: string | null;
  image_url: string;
  urgency: string;
  findings: Finding[];
  agent_synthesis: AgentSynthesis;
  model_results: Record<string, unknown>;
  created_at: string;
}

export interface ScanListItem {
  id: string;
  scan_type: string;
  session_label?: string | null;
  image_url: string;
  urgency: string;
  findings_count: number;
  created_at: string;
}

export interface ScanListResponse {
  scans: ScanListItem[];
  total: number;
}

// ── Chat ──────────────────────────────────────────────────────────
export interface ChatMessage {
  id?: string;
  role: "user" | "assistant";
  content: string;
  created_at?: string;
}

export interface ChatResponse {
  session_id: string;
  reply: string;
  doctor_type?: string | null;
  home_remedies: string[];
  /** False when the AI service could not be reached; `error` says why. */
  ok?: boolean;
  error?: string | null;
  mode?: "online_ai" | "basic_guidance";
  notice?: string | null;
  sources?: string[];
}

export interface ChatSession {
  id: string;
  title?: string | null;
  created_at: string;
}

// ── Diet ──────────────────────────────────────────────────────────
export interface MealItem {
  name: string;
  description: string;
  calories?: number | null;
  nutrients?: string | null;
}

export interface DayPlan {
  day: string;
  breakfast: MealItem;
  lunch: MealItem;
  dinner: MealItem;
  snacks: MealItem[];
}

export interface DietPlanResponse {
  title: string;
  summary: string;
  plan: DayPlan[];
  tips: string[];
}

// ── Clinics ───────────────────────────────────────────────────────
export interface ClinicResult {
  name: string;
  type: string;
  address: string;
  lat: number;
  lon: number;
  distance_km: number;
  maps_url: string;
}

export interface ClinicSearchResponse {
  clinics: ClinicResult[];
  total: number;
  search_location: { lat: number; lon: number; radius_km: number };
}

// ── Dashboard ─────────────────────────────────────────────────────
export interface ModelPerformance {
  name: string;
  task: string;
  auc: number;
  color: string;
}

export interface DashboardStats {
  total_scans: number;
  critical_findings: number;
  avg_confidence: number;
  avg_report_time: number;
  recent_scans: ScanListItem[];
  finding_distribution: Record<string, number>;
  model_performance: ModelPerformance[];
}
