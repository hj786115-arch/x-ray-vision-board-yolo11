---
title: XRayVision AI Backend
emoji: 🩻
colorFrom: blue
colorTo: blue
sdk: docker
app_port: 7860
pinned: false
---

# XRayVision AI — Backend

Advanced medical diagnostic API using a Hybrid Multi-Model Ensemble.

## Quick Start

```bash
# 1. Create virtual environment
python -m venv venv
venv\Scripts\activate  # Windows
# source venv/bin/activate  # Mac/Linux

# 2. Install dependencies
pip install -r requirements.txt

# 3. Copy environment variables
copy .env.example .env
# Edit .env with your Supabase, OpenRouter, and Hugging Face keys

# 4. Download the pinned fracture detector (no paid API required)
python download_fracture_model.py

# 5. Run the server
uvicorn app.main:app --reload --port 8000
```

## API Documentation

Once running, visit:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## Models

| Model | Task | Input | Output |
|-------|------|-------|--------|
| TorchXRayVision DenseNet121 | Chest Pathology | 224×224 grayscale | 18 pathology probabilities |
| YOLO11 ONNX | Fracture Localization | Any size RGB | Positive fracture boxes only |
| HF fracture classifier | Fracture Screening | 224x224 RGB | Image-level fracture/normal probability |
| Wound-specific HF classifier | Wound Classification | 224×224 RGB | Classification labels |
| OpenRouter GLM 4.5 Air | Agentic Synthesis | Model outputs + notes | Structured diagnostic report |

Fracture scans use a safer two-stage workflow:
- YOLO localizes visible fracture boxes when it can.
- The pretrained classifier provides image-level fracture suspicion.
- Detector `Not_Fracture` boxes are ignored because they do not prove the whole scan is normal.

## Database Setup

1. Create a Supabase project at https://supabase.com
2. Run `supabase_schema.sql` in the SQL Editor
3. Create a storage bucket named `xray-images` (public — the app renders images directly via their public URL)
4. Copy the project URL and keys into `.env`

## Docker Deployment (HF Spaces)

```bash
docker build -t xrayvision-backend .
docker run -p 7860:7860 --env-file .env xrayvision-backend
```

## YOLO11 deployment

Set `YOLO_WEIGHTS_PATH=models/fracture_yolo11.onnx`, `YOLO_MODEL_NAME=YOLO11`, `YOLO_IMAGE_SIZE=640`, and `FRACTURE_CONFIDENCE_THRESHOLD=0.40`. Docker downloads and verifies the weights automatically. See `docs/YOLO11_DEPLOYMENT.md` in the full repository for the frontend/backend deployment sequence and the recorded accuracy limitations.
