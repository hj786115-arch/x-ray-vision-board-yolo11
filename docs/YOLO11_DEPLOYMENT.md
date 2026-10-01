# Deploy the YOLO11 clone

This repository contains the complete original frontend and backend plus the fracture detector integration and localization display fixes. The original repository is unchanged. Application findings remain in English; the existing language selector and other models retain their original behavior.

**Validation status:** build, type checks and localization regression tests pass. Two additional labelled fracture X-rays were missed at the configured 0.40 threshold; lowering the threshold did not correctly match either annotation. This is an integration-ready research prototype, not a demonstrated accuracy upgrade. See [test evidence](YOLO11_CLEAN_TESTS.md).

## 1. Deploy the complete app on Vercel

Import `hj786115-arch/x-ray-vision-board-yolo11` into a **new** Hobby project using the repository root and the **Services** preset. The root `vercel.json` defines:

- `app`: the unchanged Vite/TanStack SPA, built to `dist/client` with `VITE_API_URL=/api`.
- `backend`: the Python container built from `backend/Dockerfile.vercel`, reachable through `/api` on the same domain.

`backend/vercel_main.py` mounts the existing API under that prefix and preserves its startup/shutdown lifecycle. The original API entry point and Hugging Face Dockerfile still work for separate hosting. No browser CORS workaround or old-backend URL is required.

The container installs CPU-only PyTorch, verifies the pinned YOLO11 download, and caches the three existing classifiers during the build. All four vision models remain enabled. Models load into memory when needed, rather than simultaneously at startup. No paid inference endpoint is used. Vercel Hobby resource/usage limits still apply and must be checked against the deployed workload.

### Required environment variables

Add these in Vercel's environment settings before treating the deployment as functional. Use the **same Supabase project** as the existing application to retain its users, demo account, scan history, and storage.

| Variable | Value/source |
| --- | --- |
| `SUPABASE_URL` | Existing Supabase project URL |
| `SUPABASE_KEY` | Existing service-role/secret key; server only |
| `SUPABASE_ANON_KEY` | Existing anonymous/publishable key used by Supabase Auth |
| `JWT_SECRET` | A strong private random secret, entered in hosting settings |
| `OPENROUTER_API_KEY` | Existing OpenRouter key for chat, diet, and report generation |
| `FRONTEND_URL` | New production Vercel origin |
| `OPENROUTER_SITE_URL` | New production Vercel origin |

Do not prefix secrets with `VITE_`, commit them, or paste them in support chats. The frontend API URL is set by the build command, so no separate `VITE_API_URL` setting is needed. `PORT` can remain unset (the container listens on port 80); `DISABLE_PRELOAD=true` is set in the container without disabling any model.

The Supabase schema is in `backend/supabase_schema.sql`. For an existing database, verify its tables and storage rather than blindly recreating them. A new empty database will not contain the existing demo login. A successful `/api/health` response only verifies the server, not database access.

## 2. Optional separate Python hosting

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

The checked-in Vercel configuration deploys both services together. Separate hosting requires a frontend-only Vercel configuration, a build-time `VITE_API_URL` pointing at the **new** backend, and matching CORS origins. Pointing the frontend at the old backend would still run the old detector. Creating a new Hugging Face Space may require a paid account under current platform policy; do not assume a new free Space is available.

## 3. Verify the deployed flow

Open `/api/` and `/api/docs` on the Vercel domain. Confirm the API identifies YOLO11. Sign in through the frontend, including **Try demo account**, and submit an X-ray with scan type **Fracture**. Confirm the returned `models_run` includes `YOLO11-Fracture`, inspect `model_errors`, and compare every visible box against the original image. Reload the scan history and reopen the saved scan to verify real database and storage persistence. Also check the existing chest, wound, chat, and diet flows before declaring the full deployment verified.

An image-level classifier score does not establish fracture location. If YOLO cannot localize a fracture, the application intentionally returns no fabricated box.

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
