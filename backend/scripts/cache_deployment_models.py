"""Cache the unchanged public model weights while building the container.

No database connection or API credential is needed for these public downloads.
The temporary settings secret exists only in this build process; runtime still
requires a real JWT_SECRET configured in the hosting environment.
"""

import os
from pathlib import Path
import secrets
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
os.environ.setdefault("JWT_SECRET", secrets.token_urlsafe(48))

from app.services.chest_model import _get_model as load_chest
from app.services.fracture_classifier import _get_model as load_classifier
from app.services.image_router import _get_model as load_router
from app.services.wound_model import _get_model as load_wound


if __name__ == "__main__":
    for name, loader in (
        ("DenseNet121", load_chest),
        ("FractureClassifier", load_classifier),
        ("WoundClassifier", load_wound),
        ("ImageModalityRouter", load_router),
    ):
        print(f"Caching {name}...", flush=True)
        loader()
        print(f"Cached {name}.", flush=True)
