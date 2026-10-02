<div align="center">

<img src="https://img.shields.io/badge/XRayVision-AI-0E7490?style=for-the-badge&logo=lunacy&logoColor=white" alt="XRayVision AI" height="40"/>

# 🩻 XRayVision AI

### AI-Powered Medical Diagnostic Platform

**Automated X-Ray Analysis · Fracture Detection · Wound Classification · Clinical Report Generation**

[![Live Demo](https://img.shields.io/badge/🌐_Live_Demo-x--ray--vision--board.vercel.app-0E7490?style=flat-square)](https://x-ray-vision-board.vercel.app)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg?style=flat-square)](LICENSE)
[![Python](https://img.shields.io/badge/Python-3.13-3776AB?style=flat-square&logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=flat-square&logo=supabase&logoColor=white)](https://supabase.com)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-F38020?style=flat-square&logo=cloudflare&logoColor=white)](https://workers.cloudflare.com)

[![Deployment](https://img.shields.io/badge/Backend-Hugging_Face_Spaces-FFD21E?style=flat-square&logo=huggingface&logoColor=black)](https://huggingface.co/spaces)
[![PyTorch](https://img.shields.io/badge/PyTorch-DenseNet121-EE4C2C?style=flat-square&logo=pytorch&logoColor=white)](https://pytorch.org)
[![YOLO11](https://img.shields.io/badge/Ultralytics-YOLO11-00BFFF?style=flat-square)](https://ultralytics.com)
[![HuggingFace](https://img.shields.io/badge/HuggingFace-ViT-FFD21E?style=flat-square&logo=huggingface&logoColor=black)](https://huggingface.co)
[![OpenRouter](https://img.shields.io/badge/OpenRouter-GLM_4.5_Air-6B46C1?style=flat-square)](https://openrouter.ai)

> ⚠️ **Educational Platform Only** — This is an AI-assisted learning tool. Not a certified medical device or substitute for professional radiological evaluation.

</div>

---

## October 2 review branch — not deployed

This branch prepares two explicitly selected fracture profiles: a pinned YOLO26s
pediatric-wrist checkpoint and a YOLOv8s multi-region research checkpoint.
The upload form requires a Bone area selection; automatic anatomical routing has
not been validated. Independent CLIP routing only selects the image family.
See [actual comparisons and limitations](docs/DETECTION_VALIDATION_2026_10_02.md).
False positives and missed fractures remain. **90–95% accuracy on unseen whole-body
X-rays has not been demonstrated.** No training was performed on the test images.
Model scores do not measure clinical severity. A missing box is inconclusive.
The production deployment is unchanged. Automatic deployment is disabled for
`review/xray-evidence-2026-10-02`; deployment needs the owner's approval.
The setup notes below record the earlier YOLO11 deployment; current backend
settings and `download_fracture_model.py` define this review's model profiles.

## YOLO11 clone: setup and validation

Complete source imported from `ZohaibCodez/x-ray-vision-board` with scoped fracture model and box-display changes. The original repository, UI design and other model implementations are unchanged. New findings are in English. The Live Demo link above is the original deployment.

- [Deploy this clone: backend first, then Vercel](docs/YOLO11_DEPLOYMENT.md)
- [Changes and verification](docs/YOLO11_REVIEW.md)
- [Two clean labelled X-ray tests and actual results](docs/YOLO11_CLEAN_TESTS.md)

**Accuracy limitation:** neither clean test image was correctly localized by this checkpoint. Build and rendering checks passed, but improved fracture accuracy is unproven. No boxes are fabricated for missed detections.

## 📌 What is XRayVision AI?

**XRayVision AI** is a full-stack web application that allows medical students, radiologists, and healthcare professionals to upload medical images and receive an **AI-powered diagnostic report in seconds**.

The system uses a **Hybrid Multi-Model Ensemble**:
- 🫁 **DenseNet121** — detects 18 chest pathologies (trained on 700K+ clinical X-rays)
- 🦴 **YOLO11** — localises fractures with bounding boxes drawn on the image
- 🩹 **ViT (Vision Transformer)** — classifies external wounds into 6 categories
- 🤖 **GLM 4.5 Air (LLM)** — synthesizes all model findings into a clinical paragraph

Built as a **Final Year Project (FYP)** at Minhaj University Lahore — BSSE 8th Semester, May 2026.

---

## ✨ Key Features

<table>
<tr>
<td width="50%">

### 🔬 Diagnostics
- **Chest X-Ray Analysis** — 18 pathologies with ICD-10 codes (Pneumonia, Atelectasis, Effusion, Cardiomegaly...)
- **Fracture Detection** — YOLO11 bounding boxes + optional image-level classifier
- **Wound Classification** — Pressure ulcer, venous ulcer, diabetic foot, traumatic wound, and more
- **AI Clinical Reports** — Urgency rating (critical/high/medium/low/clear), recommended actions, specialist referral
- **DICOM Support** — Accepts standard medical DICOM files alongside JPG/PNG

</td>
<td width="50%">

### 🏥 Platform
- **Dashboard Analytics** — Total scans, urgent findings, model confidence, finding distribution
- **Scan History** — Full history with PDF report export and JSON export
- **Health Chatbot** — Medical Q&A in English and Urdu (bilingual)
- **Diet Plan Generator** — Personalised 7-day plans with clinical safety guardrails
- **Clinic Locator** — GPS-based nearby hospital search
- **User Profiles** — Roles, avatars, preferences, scan statistics

</td>
</tr>
</table>

---

## 🏗 Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                    Frontend (React 19)                        │
│  TanStack Start + Router + Query  ·  TailwindCSS  ·  Shadcn  │
│           Deployed → Cloudflare Workers                       │
└───────────────────────┬──────────────────────────────────────┘
                        │  HTTPS  (JWT Auth)
┌───────────────────────▼──────────────────────────────────────┐
│                   Backend (FastAPI)                           │
│  POST /analyze  ·  POST /chat  ·  POST /diet  ·  GET /stats  │
│          Deployed → Hugging Face Spaces (Docker)             │
└──────┬────────────┬─────────────┬───────────────┬────────────┘
       │            │             │               │
┌──────▼──┐  ┌──────▼──┐  ┌──────▼──┐  ┌────────▼──────┐
│DenseNet │  │ YOLO11  │  │   ViT   │  │  OpenRouter   │
│  (18    │  │(Fracture│  │ (Wound  │  │  GLM 4.5 Air  │
│ labels) │  │  bbox)  │  │  6cls)  │  │  (Synthesis)  │
└─────────┘  └─────────┘  └─────────┘  └───────────────┘
       │                                        │
┌──────▼────────────────────────────────────────▼────────────┐
│                      Supabase                               │
│     PostgreSQL (scans, profiles, chat)  ·  Storage (images) │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start

### Prerequisites

| Requirement | Version | Notes |
|-------------|---------|-------|
| Node.js | ≥ 18.x | Frontend runtime |
| Python | ≥ 3.11 | Backend runtime |
| Supabase account | — | Free tier works |
| OpenRouter API key | — | Free tier (GLM 4.5 Air is free) |
| Hugging Face token | — | For ViT model download |
| YOLO weights | — | `fracture_yolo11.onnx` in `backend/models/` |

### 1. Clone the Repository

```bash
git clone https://github.com/hj786115-arch/x-ray-vision-board-yolo11.git
cd x-ray-vision-board-yolo11
```

### 2. Frontend Setup

```bash
# Install dependencies
npm install

# Create environment file
echo "VITE_API_URL=http://localhost:8000" > .env.local

# Start development server
npm run dev
# → http://localhost:5173
```

### 3. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
venv\Scripts\activate          # Windows
source venv/bin/activate       # macOS / Linux

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Fill in your keys (see Environment Variables section below)

# Download and verify the pinned YOLO11 fracture model
python download_fracture_model.py

# Start the server
uvicorn app.main:app --reload --port 8000
# → API docs at http://localhost:8000/docs
```

### 4. Database Setup

```sql
-- In your Supabase project → SQL Editor
-- Run: backend/supabase_schema.sql

-- Then create storage buckets:
-- 1. xray-images (public)
-- 2. avatars (public)
```

---

## 🔧 Environment Variables

### Backend (`backend/.env`)

```env
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-service-role-key
SUPABASE_ANON_KEY=your-anon-key

# OpenRouter (LLM synthesis)
OPENROUTER_API_KEY=sk-or-...
OPENROUTER_MODEL=z-ai/glm-4.5-air:free

# Authentication
JWT_SECRET=your-minimum-32-char-random-secret

# Hugging Face
HF_TOKEN=hf_...

# AI Models
YOLO_WEIGHTS_PATH=models/fracture_yolo11.onnx
YOLO_MODEL_NAME=YOLO11
YOLO_IMAGE_SIZE=640
FRACTURE_CONFIDENCE_THRESHOLD=0.40
CONFIDENCE_THRESHOLD=0.40

# CORS
FRONTEND_URL=http://localhost:5173

# Performance (set true on free-tier <512MB RAM hosts)
DISABLE_PRELOAD=false
```

### Frontend (`.env.local`)

```env
VITE_API_URL=http://localhost:8000
```

---

## 📡 API Reference

Live API documentation: **[http://localhost:8000/docs](http://localhost:8000/docs)** (Swagger UI)

### Core Endpoints

| Method | Endpoint | Description | Rate Limit |
|--------|----------|-------------|------------|
| `POST` | `/auth/register` | Create new account | — |
| `POST` | `/auth/login` | Sign in → returns JWT | — |
| `POST` | `/auth/forgot-password` | Send password reset email | — |
| `GET` | `/auth/me` | Get current user profile | — |
| `POST` | `/analyze` | **Upload & analyse image** (core feature) | 10/min |
| `GET` | `/scans` | List scan history | — |
| `GET` | `/scans/{id}` | Get specific scan result | — |
| `GET` | `/scans/{id}/report.pdf` | Download PDF report | — |
| `GET` | `/scans/{id}/export.json` | Export raw findings JSON | — |
| `DELETE` | `/scans/{id}` | Delete scan | — |
| `POST` | `/chat` | Health chatbot message | 20/min |
| `GET` | `/chat/sessions` | List chat sessions | — |
| `POST` | `/diet` | Generate diet plan | 10/min |
| `GET` | `/clinics` | Find nearby clinics (GPS) | — |
| `GET` | `/stats` | Dashboard statistics | — |
| `GET` | `/health` | Health check | — |

### Analysis Request Example

```bash
curl -X POST "http://localhost:8000/analyze" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@chest_xray.jpg" \
  -F "scan_type=chest" \
  -F "notes=Patient reports chest pain for 3 days"
```

### Analysis Response Example

```json
{
  "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "scan_type": "chest",
  "urgency": "high",
  "findings": [
    {
      "name": "Lung Opacity",
      "confidence": 74.2,
      "severity": "high",
      "model": "DenseNet121",
      "region": "Lung parenchyma",
      "icd_code": "R91.8",
      "color": "destructive"
    }
  ],
  "agent_synthesis": {
    "urgency": "high",
    "synthesis_text": "The imaging reveals bilateral lung opacity consistent with pneumonia. Urgent pulmonologist review is recommended.",
    "recommended_actions": [
      "Urgent Pulmonologist consultation",
      "Order CBC and CRP blood tests",
      "Consider CT chest for further characterization"
    ],
    "specialist": "Pulmonologist"
  },
  "image_url": "https://...supabase.co/storage/v1/object/public/xray-images/...",
  "created_at": "2026-06-04T10:30:00Z"
}
```

---

## 🤖 AI Models

| Model | Source | Task | Input | Threshold |
|-------|--------|------|-------|-----------|
| **DenseNet121** | TorchXRayVision | 18 chest pathologies | 224×224 grayscale | 60% |
| **YOLO11n ONNX** | Jesteban247/yolo11-fracture-onnx | Fracture bounding boxes | Original image, letterboxed to 640 | 40% |
| **ViT** | `PayamFard123/dermaintel-wound-classifier` | 6 wound types | RGB PIL Image | Top-1 |
| **GLM 4.5 Air** | OpenRouter (z-ai/glm-4.5-air:free) | Clinical report synthesis | Structured prompt | — |

### Chest Pathologies Detected (DenseNet121)

`Atelectasis` · `Cardiomegaly` · `Consolidation` · `Edema` · `Effusion` · `Emphysema` · `Fibrosis` · `Hernia` · `Infiltration` · `Mass` · `Nodule` · `Pleural Thickening` · `Pneumonia` · `Pneumothorax` · `Enlarged Cardiomediastinum` · `Lung Opacity` · `Lung Lesion` · `Fracture`

---

## 🚢 Deployment

### Frontend → Cloudflare Workers

```bash
# Build production bundle
npm run build

# Deploy via Wrangler CLI
npx wrangler deploy

# Or connect GitHub repo to Cloudflare Pages for auto-deploy
```

### Backend → Hugging Face Spaces (Docker)

```bash
cd backend

# Build Docker image
docker build -t xrayvision-backend .

# Test locally
docker run -p 7860:7860 --env-file .env xrayvision-backend

# Deploy: push to HuggingFace Spaces repo
# All env vars are set as HF Spaces secrets
```

### Deployment Stack

| Component | Platform | URL |
|-----------|----------|-----|
| Frontend | Cloudflare Workers | `x-ray-vision-board.vercel.app` |
| Backend API | Hugging Face Spaces | `*.hf.space` |
| Database | Supabase PostgreSQL | Managed cloud |
| Image Storage | Supabase Storage | Managed cloud |
| AI Models | HF Hub (downloaded at start) | `huggingface.co` |

---

## 📁 Project Structure

```
x-ray-vision-board/
├── src/                        # Frontend (React 19 + TanStack)
│   ├── routes/                 # File-based routing (one .tsx = one page)
│   │   ├── index.tsx           # Landing page
│   │   ├── dashboard.tsx       # Analytics dashboard
│   │   ├── analyze.tsx         # Image upload & analysis
│   │   ├── results.$scanId.tsx # Results with bbox overlays
│   │   ├── history.tsx         # Scan history
│   │   ├── chat.tsx            # Health chatbot
│   │   ├── diet.tsx            # Diet plan generator
│   │   └── clinics.tsx         # GPS clinic locator
│   ├── components/
│   │   ├── app/AppShell.tsx    # Sidebar + header layout
│   │   ├── landing/            # Landing page components
│   │   └── ui/                 # 50+ Shadcn/Radix components
│   ├── hooks/
│   │   ├── use-analyze.ts      # POST /analyze mutation
│   │   ├── use-scans.ts        # Scan history & stats queries
│   │   └── use-chat.ts         # Chatbot session queries
│   └── lib/
│       ├── api.ts              # Central HTTP client (ALL API calls)
│       ├── auth-context.tsx    # Global auth state (useAuth hook)
│       └── types.ts            # TypeScript types
│
├── backend/                    # Python FastAPI backend
│   └── app/
│       ├── main.py             # App bootstrap, CORS, rate limiting
│       ├── config.py           # Pydantic Settings (env vars)
│       ├── models/schemas.py   # All Pydantic request/response models
│       ├── routers/
│       │   ├── analyze.py      # Core AI pipeline endpoint
│       │   ├── auth.py         # Auth endpoints
│       │   ├── scans.py        # Scan CRUD + PDF/JSON export
│       │   ├── chat.py         # Chatbot endpoints
│       │   ├── diet.py         # Diet plan generator
│       │   ├── stats.py        # Dashboard statistics
│       │   └── clinics.py      # GPS clinic search
│       ├── services/
│       │   ├── image_preprocess.py  # CLAHE, resize, DICOM support
│       │   ├── chest_model.py       # DenseNet121 inference
│       │   ├── fracture_model.py    # YOLO11 inference
│       │   ├── wound_model.py       # ViT wound classifier
│       │   ├── openrouter_agent.py  # LLM synthesis engine
│       │   ├── chatbot_service.py   # Chatbot (EN/UR system prompts)
│       │   └── diet_service.py      # Diet plan generation
│       └── utils/supabase_client.py # All Supabase DB operations
│
├── LICENSE                     # MIT License
├── CONTRIBUTING.md             # Contribution guidelines
├── CODE_OF_CONDUCT.md          # Community standards
├── SECURITY.md                 # Security policy & reporting
└── README.md                   # This file
```

---

## 🔒 Security

- **JWT Authentication** — HS256 tokens, 24-hour expiry, server refuses default secret
- **Row Level Security** — Supabase RLS on all tables (users see only their own data)
- **Rate Limiting** — slowapi: 200/min global, 10/min for AI endpoints
- **CORS** — Production locked to configured frontend domain only
- **Input Validation** — Pydantic validates all request bodies before processing

See [SECURITY.md](SECURITY.md) for vulnerability reporting instructions.

---

## 🤝 Contributing

We welcome contributions! Please read our [Contributing Guidelines](CONTRIBUTING.md) first.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed setup, coding standards, and submission process.

---

## 📜 License

This project is licensed under the **MIT License** — see [LICENSE](LICENSE) for details.

> **Medical Disclaimer:** This software is for **educational purposes only**. It is NOT a certified medical device and must NOT be used for clinical diagnosis or treatment decisions. Always consult a qualified medical professional.

---

## 👥 Team

| Name | Role | ID |
|------|------|-----|
| **Muhammad Ali Raza** | Developer | 2022F-MUL-BSSWE-017 |
| **Hamza Afzal** | Developer | 2022F-MUL-BSSWE-027 |

**Supervisor:** Maam Misbah — Lecturer, School of Software Engineering  
**Institution:** Minhaj University Lahore  
**Programme:** BSSE 8th Semester — Final Year Project (May 2026)

---

## 🙏 Acknowledgements

- [TorchXRayVision](https://github.com/mlmed/torchxrayvision) — DenseNet121 pretrained on clinical X-rays
- [Ultralytics YOLO11](https://github.com/ultralytics/ultralytics) — Object detection framework
- [PayamFard123/dermaintel-wound-classifier](https://huggingface.co/PayamFard123/dermaintel-wound-classifier) — ViT wound classifier
- [OpenRouter](https://openrouter.ai) — Free LLM API access (GLM 4.5 Air)
- [Supabase](https://supabase.com) — Database, Auth, and Storage
- [TanStack](https://tanstack.com) — React Start, Router, and Query
- [Shadcn/ui](https://ui.shadcn.com) — Beautiful UI components

---

<div align="center">

Made with ❤️ at **Minhaj University Lahore**

[![GitHub stars](https://img.shields.io/github/stars/ZohaibCodez/x-ray-vision-board?style=social)](https://github.com/ZohaibCodez/x-ray-vision-board/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/ZohaibCodez/x-ray-vision-board?style=social)](https://github.com/ZohaibCodez/x-ray-vision-board/network/members)
[![GitHub issues](https://img.shields.io/github/issues/ZohaibCodez/x-ray-vision-board?style=social)](https://github.com/ZohaibCodez/x-ray-vision-board/issues)

</div>
