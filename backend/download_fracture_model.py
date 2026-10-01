"""Download the exact reviewed YOLO11 ONNX artifact; no HF token is required."""
import hashlib
from pathlib import Path
import urllib.request

REVISION = "8227dbcdcf80f3cd06f052a8295ee42657989deb"
URL = f"https://huggingface.co/Jesteban247/yolo11-fracture-onnx/resolve/{REVISION}/best.onnx"
SHA256 = "5f16fff48dc54a5ca2b4c625a8df4d55c2beaef18b202fc8dba6e1117a112686"


def main():
    target = Path(__file__).parent / "models" / "fracture_yolo11.onnx"
    target.parent.mkdir(exist_ok=True)
    if target.exists() and hashlib.sha256(target.read_bytes()).hexdigest() == SHA256:
        print(f"Verified existing weights: {target}")
        return
    with urllib.request.urlopen(URL, timeout=120) as response:
        data = response.read()
    if hashlib.sha256(data).hexdigest() != SHA256:
        raise RuntimeError("Downloaded weights failed the SHA256 check")
    temporary = target.with_suffix(".download")
    temporary.write_bytes(data)
    temporary.replace(target)
    print(f"Downloaded and verified: {target}")


if __name__ == "__main__":
    main()
