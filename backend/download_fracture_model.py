"""Download pinned, hash-verified fracture checkpoints for review profiles."""
import hashlib
from pathlib import Path
import urllib.request

ARTIFACTS = [
    ("fracture_multiregion.pt", "https://huggingface.co/MMMJavid/xray-fracture-localizer/resolve/d97e34132fb97d5b1163eba4ace3d49295b3e66f/model.pt", "a206f388b2570ca89557868b61da50511ac99b9e7938f9cd9dd34d6690248a7b"),
    ("fracture_yolo26.pt", "https://huggingface.co/Crimson-Dawn/grazpedwri-yolo26-checkpoints/resolve/01213afe2b4e978585339b3a0d5c6e23b38d538b/runs/hardneg_yolo26s_640_100epochs_seed42_20260918_123707_008523Z/weights/best.pt", "77fa47eb3bc463c114e4a442edd85652eaf55161706f95f05f39be4210782907"),
]

def main():
    folder = Path(__file__).parent / "models"
    folder.mkdir(exist_ok=True)
    for name, url, expected in ARTIFACTS:
        target = folder / name
        if target.exists() and hashlib.sha256(target.read_bytes()).hexdigest() == expected:
            print(f"Verified existing weights: {name}")
            continue
        with urllib.request.urlopen(url, timeout=120) as response:
            data = response.read()
        if hashlib.sha256(data).hexdigest() != expected:
            raise RuntimeError(f"SHA256 verification failed: {name}")
        temporary = target.with_suffix(".download")
        temporary.write_bytes(data)
        temporary.replace(target)
        print(f"Downloaded and verified: {name}")

if __name__ == "__main__":
    main()
