"""Reproduce two preselected public, labelled X-ray localization checks.

Run from backend/ after configuring .env and downloading the model.
Dataset: Roboflow 100 bone-fracture-7fylg, CC BY 4.0, LibreYOLO mirror.
These images are not known to be independent of the model's training data.
No application settings are modified. Exit status reports execution, not accuracy.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path
import sys
from urllib.request import urlopen

import cv2

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.config import get_settings
from app.services.fracture_model import predict_fractures

DATASET = "https://huggingface.co/datasets/LibreYOLO/bone-fracture-7fylg"
REVISION = "c5c74eb4e6050d217f37a965666974e8cee39f8e"
# First two alphabetically ordered test images with class 1 fracture labels.
# Chosen before inference; failures are retained in the results.
SAMPLES = [
    "118_jpg.rf.33edb8c0886863954b9301ba80a7d573",
    "124_jpg.rf.18d4b52cb019bc4639c057baf7e222c7",
]


def iou(a, b):
    intersection = max(0, min(a[2], b[2]) - max(a[0], b[0])) * max(
        0, min(a[3], b[3]) - max(a[1], b[1])
    )
    union = ((a[2] - a[0]) * (a[3] - a[1])
             + (b[2] - b[0]) * (b[3] - b[1]) - intersection)
    return intersection / union if union else 0.0


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output-dir", type=Path, required=True)
    args = parser.parse_args()
    args.output_dir.mkdir(parents=True, exist_ok=True)
    threshold = get_settings().fracture_confidence_threshold
    records = []
    for sample in SAMPLES:
        for folder, suffix in [("images", ".jpg"), ("labels", ".txt")]:
            url = f"{DATASET}/resolve/{REVISION}/test/{folder}/{sample}{suffix}"
            with urlopen(url, timeout=60) as response:
                (args.output_dir / (sample + suffix)).write_bytes(response.read())
        image = cv2.imread(str(args.output_dir / (sample + ".jpg")))
        if image is None:
            raise ValueError(f"Could not decode {sample}")
        height, width = image.shape[:2]
        truth = []
        for line in (args.output_dir / (sample + ".txt")).read_text().splitlines():
            class_id, x, y, w, h = map(float, line.split())
            if class_id == 1:
                truth.append([(x-w/2)*width, (y-h/2)*height,
                              (x+w/2)*width, (y+h/2)*height])
        findings = predict_fractures(image, confidence_threshold=threshold)
        boxes = []
        for finding in findings:
            if not finding.get("bbox"):
                continue
            b = finding["bbox"]
            boxes.append([b["x"]*width/100, b["y"]*height/100,
                          (b["x"]+b["w"])*width/100,
                          (b["y"]+b["h"])*height/100])
        best_ious = [max((iou(g, p) for p in boxes), default=0.0) for g in truth]
        record = {"sample": sample, "ground_truth_xyxy": truth,
                  "findings": findings, "best_iou_per_annotation": best_ious,
                  "matched_annotations_iou_0_5": sum(v >= .5 for v in best_ious)}
        records.append(record)
        print(json.dumps(record), flush=True)
    output = {"dataset": DATASET, "revision": REVISION,
              "confidence_threshold": threshold, "results": records}
    (args.output_dir / "results.json").write_text(json.dumps(output, indent=2))


if __name__ == "__main__":
    main()
