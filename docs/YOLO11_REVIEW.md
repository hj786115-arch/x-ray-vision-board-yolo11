# YOLO11 fracture localization review

Review branch: `review/yolo11-fracture-local`.
Original source: `ZohaibCodez/x-ray-vision-board` at `25f3934ce3e4dec0130f5611353b5abdf750fac9`.
Delivery repository: `hj786115-arch/x-ray-vision-board-yolo11` (standalone import of the original source). The original repository is unchanged. No production deployment has been made.

**Latest clean-image check: neither of the two preselected labelled fracture images was localized correctly. The software integration and box rendering fixes pass, but improved diagnostic accuracy has NOT been established.** See [the reproducible results](YOLO11_CLEAN_TESTS.md).

## Detector

- Source: https://huggingface.co/Jesteban247/yolo11-fracture-onnx
- Revision: `8227dbcdcf80f3cd06f052a8295ee42657989deb`
- SHA256: `5f16fff48dc54a5ca2b4c625a8df4d55c2beaef18b202fc8dba6e1117a112686`
- Verified ONNX metadata: YOLO11n, one class (`fracture`), input `float32 [1,3,640,640]`, output `[1,5,8400]`; file size 10,604,520 bytes. Although the model card says FP16, the supplied artifact is FP32.
- No API key or paid inference provider is required for local CPU inference.
- The Hub card declares MIT; embedded artifact metadata declares AGPL-3.0. Retain upstream notices and resolve licensing requirements before any commercial redistribution.
- The author's card reports mAP50 0.920 and mAP50-95 0.524. Uploaded training CSV peaks around 0.9163 / 0.5204. These are author-reported dataset metrics, not a reproduced benchmark or a guarantee of accuracy on the user's images.
- Also found `dlxray/fracturedetection-yolov12`, but the inspected repository provides a checkpoint without a model card, dataset description, benchmark, or declared license. It was not selected.
- Newer generic YOLO26 models exist; generic COCO weights do not provide fracture localization out of the box.

## Changes scoped to fracture localization

1. Use pinned fracture-trained YOLO11 ONNX weights at their required 640 input size.
2. Use decoded original pixels instead of applying the old detector's CLAHE transform.
3. Keep fracture classes only, use NMS, preserve original-image coordinates, clip invalid/out-of-image boxes, and do not fabricate boxes for classifier-only findings.
4. Remove unsupported hardware/brightness/classifier rules that renamed suspected fractures as healed or old injuries.
5. Preserve the unchanged classifier's second opinion, including disagreement, without allowing it to erase the detector's localization.
6. Show all valid fracture boxes, rather than the single highest-confidence finding regardless of its class.
7. Use a neutral localized-region label instead of guessing anatomy from vertical box position. A detector confidence score is not clinical severity.
8. Replace the definitive negative message with a localization limitation when no box is found. Detector/UI version labels updated; remove the inherited hard-coded YOLO 89.1% dashboard fallback.
9. Docker build downloads/checks the exact artifact using `download_fracture_model.py`; existing YOLOv8 weights remain available for rollback.

The DenseNet, wound model, image-level fracture classifier and OpenRouter implementation files are byte-for-byte unchanged, as are styles, authentication and database code.

## Reproduced result and limitations

Input was the X-ray region cropped from the user's screenshot, 645x648 pixels. The Shutterstock marks and original blue overlay were retained. No original radiograph or radiologist-labelled ground truth was supplied.

- Original YOLOv8 function, with its existing CLAHE and 1280 inference: 23 findings on this crop, mostly `Metallic Implant` watermark detections; its strongest score was 86.8%.
- YOLO11 at 0.25 produced a 52.5% suspected-fracture box and a 30.5% watermark false positive.
- Reviewed 0.40 default: one suspected-fracture box at 52.5%, normalized x=51.2396, y=56.6045, width=11.3308, height=8.8416 (% of source image).
- Threshold choice suppresses that lower-confidence watermark on this sample; it has not been calibrated on a held-out set and can also suppress genuine fractures. This is a promising single-image improvement, not proof of general superiority or a clinical diagnosis.
- No detector can honestly guarantee a box for every fracture. A missed localization must remain explicit.

## Verification completed

- Seven backend regression tests: coordinate normalization, clipping, invalid boxes, class filtering, negative placeholders, classifier disagreement and no fabricated localization.
- Three frontend regression tests: multiple fractures vs higher-confidence hardware, invalid boxes, other scan types.
- Actual `/analyze` HTTP test returned 200 with real YOLO11 inference and no model errors. Authentication and persistence were isolated fixtures; the remote LLM was replaced with the existing deterministic fallback. The optional image-level classifier was disabled for this isolated detector test. The full deployed ensemble was NOT revalidated.
- Browser rendered the unchanged results layout with the actual recorded API result. Desktop, 125% zoom and 390px mobile box alignment each passed (<0.01 percentage point discrepancy); no page JavaScript errors.
- TypeScript check and production build passed. This execution host needed an ignored local Vite config specifying IPv4 for prerendering because its default IPv6 preview failed. Production Vite config was not changed.

## Run locally / deploy

From `backend/`, install `requirements.txt`, run `python download_fracture_model.py`, and set:

```env
YOLO_WEIGHTS_PATH=models/fracture_yolo11.onnx
YOLO_MODEL_NAME=YOLO11
YOLO_IMAGE_SIZE=640
FRACTURE_CONFIDENCE_THRESHOLD=0.40
ALLOW_GENERIC_YOLO_WEIGHTS=false
```

Existing environment values override defaults: update an existing `YOLO_WEIGHTS_PATH` explicitly. Preserve the existing Supabase, JWT, OpenRouter and other model configuration securely; do not commit secrets.

Backend: `uvicorn app.main:app --host 0.0.0.0 --port 8000`.
Frontend: `npm ci`, configure `VITE_API_URL`, then `npm run dev` / `npm run build`.
Tests: from backend `python -m unittest discover -s tests -v`; from repository root (Node 22.18+ / 24) `node --test tests/fracture-boxes.test.mjs` and `npx tsc --noEmit`.

Vercel hosts the frontend in this architecture; the Python inference backend needs its own running service. Publishing a new frontend repository alone will not switch the deployed detector. See [deployment instructions](YOLO11_DEPLOYMENT.md). No new paid hosting has been selected or purchased. Validate further original X-rays, including normal images and difficult negatives, before claiming improved accuracy.
