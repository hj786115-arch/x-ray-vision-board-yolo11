/**
 * API client for XRayVision AI backend.
 *
 * Axios instance with JWT interceptor and typed request functions.
 */

import type {
  AuthResponse,
  ScanResult,
  ScanListResponse,
  DashboardStats,
  ChatResponse,
  ChatSession,
  ChatMessage,
  DietPlanResponse,
  ClinicSearchResponse,
} from "./types";

// Strip any trailing slash so `${API_URL}${path}` never produces a double
// slash (e.g. ".hf.space//auth/register"), which 404s on HF Spaces routing.
const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:8000").replace(/\/+$/, "");

// ── Helpers ───────────────────────────────────────────────────────

function getToken(): string | null {
  return localStorage.getItem("xray_token");
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  // Don't set Content-Type for FormData (browser sets it with boundary)
  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(errorBody.detail || `Request failed: ${res.status}`);
  }

  return res.json();
}

// ── Auth API ──────────────────────────────────────────────────────

export const authApi = {
  async login(email: string, password: string): Promise<AuthResponse> {
    const data = await request<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    localStorage.setItem("xray_token", data.access_token);
    localStorage.setItem("xray_user", JSON.stringify(data.user));
    return data;
  },

  async register(
    email: string,
    password: string,
    full_name: string,
    role: string,
  ): Promise<AuthResponse> {
    const data = await request<AuthResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, full_name, role }),
    });
    localStorage.setItem("xray_token", data.access_token);
    localStorage.setItem("xray_user", JSON.stringify(data.user));
    return data;
  },

  async getMe() {
    return request<AuthResponse["user"]>("/auth/me");
  },

  async updateProfile(params: {
    full_name?: string;
    role?: string;
    avatar_url?: string | null;
  }) {
    const user = await request<AuthResponse["user"]>("/auth/profile", {
      method: "PATCH",
      body: JSON.stringify(params),
    });
    localStorage.setItem("xray_user", JSON.stringify(user));
    return user;
  },

  async updateAvatar(file: File) {
    const formData = new FormData();
    formData.append("file", file);
    const user = await request<AuthResponse["user"]>("/auth/avatar", {
      method: "POST",
      body: formData,
    });
    localStorage.setItem("xray_user", JSON.stringify(user));
    return user;
  },

  async updateSettings(settings: Record<string, unknown>) {
    const user = await request<AuthResponse["user"]>("/auth/settings", {
      method: "PATCH",
      body: JSON.stringify({ settings }),
    });
    localStorage.setItem("xray_user", JSON.stringify(user));
    return user;
  },

  logout() {
    localStorage.removeItem("xray_token");
    localStorage.removeItem("xray_user");
  },

  getStoredUser() {
    const raw = localStorage.getItem("xray_user");
    if (!raw) return null;
    try {
      return JSON.parse(raw) as AuthResponse["user"];
    } catch {
      return null;
    }
  },

  isAuthenticated(): boolean {
    return !!getToken();
  },
};

// ── Analyze API ───────────────────────────────────────────────────

export const analyzeApi = {
  async submit(
    file: File,
    scanType: string,
    sessionLabel?: string,
    notes?: string,
    boneArea?: string,
  ): Promise<ScanResult> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("scan_type", scanType);
    if (boneArea) formData.append("bone_area", boneArea);
    if (sessionLabel) formData.append("session_label", sessionLabel);
    if (notes) formData.append("notes", notes);

    return request<ScanResult>("/analyze", {
      method: "POST",
      body: formData,
    });
  },
};

// ── Scans API ─────────────────────────────────────────────────────

export const scansApi = {
  async list(params?: {
    scan_type?: string;
    limit?: number;
    offset?: number;
  }): Promise<ScanListResponse> {
    const query = new URLSearchParams();
    if (params?.scan_type) query.set("scan_type", params.scan_type);
    if (params?.limit) query.set("limit", String(params.limit));
    if (params?.offset) query.set("offset", String(params.offset));
    const qs = query.toString();
    return request<ScanListResponse>(`/scans${qs ? `?${qs}` : ""}`);
  },

  async get(scanId: string): Promise<ScanResult> {
    return request<ScanResult>(`/scans/${scanId}`);
  },

  async delete(scanId: string): Promise<void> {
    await request(`/scans/${scanId}`, { method: "DELETE" });
  },

  async downloadPdf(scanId: string): Promise<Blob> {
    const token = getToken();
    const res = await fetch(`${API_URL}/scans/${scanId}/report.pdf`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) {
      const errorBody = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(errorBody.detail || `Request failed: ${res.status}`);
    }
    return res.blob();
  },

  async exportJson(scanId: string): Promise<unknown> {
    return request(`/scans/${scanId}/export.json`);
  },
};

// ── Stats API ─────────────────────────────────────────────────────

export const statsApi = {
  async get(): Promise<DashboardStats> {
    return request<DashboardStats>("/stats");
  },
};

// ── Chat API ──────────────────────────────────────────────────────

export const chatApi = {
  async send(
    message: string,
    sessionId?: string,
    language: string = "en",
  ): Promise<ChatResponse> {
    return request<ChatResponse>("/chat", {
      method: "POST",
      body: JSON.stringify({
        message,
        session_id: sessionId || null,
        language,
      }),
    });
  },

  async sessions(): Promise<ChatSession[]> {
    return request<ChatSession[]>("/chat/sessions");
  },

  async messages(sessionId: string): Promise<ChatMessage[]> {
    return request<ChatMessage[]>(`/chat/sessions/${sessionId}/messages`);
  },
};

// ── Diet API ──────────────────────────────────────────────────────

export const dietApi = {
  async generate(params: {
    condition?: string;
    dietary_preferences?: string;
    restrictions?: string[];
    goals?: string;
    language?: string;
  }): Promise<DietPlanResponse> {
    return request<DietPlanResponse>("/diet", {
      method: "POST",
      body: JSON.stringify(params),
    });
  },
};

// ── Clinics API ───────────────────────────────────────────────────

export const clinicApi = {
  async locations(query: string): Promise<{ locations: { name: string; lat: number; lon: number }[] }> {
    return request(`/clinics/locations?${new URLSearchParams({ query })}`);
  },
  async search(params: {
    lat: number;
    lon: number;
    radius_km?: number;
  }): Promise<ClinicSearchResponse> {
    const query = new URLSearchParams({
      lat: String(params.lat),
      lon: String(params.lon),
      ...(params.radius_km ? { radius_km: String(params.radius_km) } : {}),
    });
    return request<ClinicSearchResponse>(`/clinics?${query}`);
  },
};
