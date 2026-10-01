# Deploy the YOLO11 clone

This repository contains the complete original frontend and backend plus the fracture detector integration and localization display fixes. The original repository is unchanged. Application findings remain in English; the existing language selector and other models retain their original behavior.

**Validation status:** build, type checks and localization regression tests pass. Two additional labelled fracture X-rays were missed at the configured 0.40 threshold; lowering the threshold did not correctly match either annotation. This is an integration-ready research prototype, not a demonstrated accuracy upgrade. See [test evidence](YOLO11_CLEAN_TESTS.md).

## 1. Deploy the Python backend

Use the existing backend hosting workflow. For a Hugging Face Docker Space, copy the contents of `backend/` into the Space root, including its Dockerfile and README. Keep the existing service secrets in hosting settings. The Docker build downloads and verifies the pinned YOLO11 weights automatically; no paid model API is needed. The download is approximately 10.6 MB. The ONNX file is intentionally not committed to Git.

Set or replace these environment values, especially if copying settings from the old backend:

```env
YOLO_WEIGHTS_PATH=models/fracture_yolo11.onnx
YOLO_MODEL_NAME=YOLO11
YOLO_IMAGE_SIZE=640
FRACTURE_CONFIDENCE_THRESHOLD=0.40
ALLOW_GENERIC_YOLO_WEIGHTS=false
```

Preserve your existing `SUPABASE_URL`, `SUPABASE_KEY` (or `SUPABASE_SERVICE_ROLE_KEY`), `SUPABASE_ANON_KEY`, `JWT_SECRET`, `OPENROUTER_API_KEY`, and other model settings in the host's secrets/environment interface. Do not put real secrets in the repository. Configure `FRONTEND_URL` and `ALLOWED_ORIGINS` with the new Vercel origin. The Docker service listens on port 7860.

For a local backend, from `backend/`:

```bash
python -m venv .venv
# Activate .venv for your operating system.
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your real settings and a non-default JWT_SECRET.
python download_fracture_model.py
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

## 2. Deploy the frontend on Vercel

1. Import `hj786115-arch/x-ray-vision-board-yolo11` into a new Vercel project.
2. Use the repository root and its existing `vercel.json`. Build command: `npm run build`. Output directory: `dist/client`.
3. Set `VITE_API_URL` to the new backend's public HTTPS URL before building. This variable is embedded at build time; redeploy after changing it.
4. Deploy and confirm the new Vercel origin is allowed by the backend's CORS settings.

Deploying only the frontend while keeping `VITE_API_URL` pointed at the old backend will still run the old detector. No existing Vercel or Hugging Face deployment has been changed by preparing this repository.

## 3. Verify the deployed flow

Open the backend `/docs`, then sign in through the frontend and submit an X-ray with scan type **Fracture**. Confirm the returned `models_run` includes `YOLO11-Fracture`, inspect `model_errors`, and compare every visible box against the original image. An image-level classifier score does not establish fracture location. If YOLO cannot localize a fracture, the application intentionally returns no fabricated box.

To reproduce the recorded detector check, from `backend/` after setup:

```bash
python scripts/check_yolo11_samples.py --output-dir ../review.local/clean-tests
python -m unittest discover -s tests -v
```

From the repository root (Node 22.18+ or 24):

```bash
npm ci
node --test tests/fracture-boxes.test.mjs
npx tsc --noEmit
npm run build
```
