FROM python:3.11-slim-bookworm

WORKDIR /app

# Install system dependencies for OpenCV
# libgl1-mesa-glx was removed in Debian Trixie — use libgl1 instead
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 libglib2.0-0 libsm6 libxrender1 libxext6 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Pin and verify the fracture detector; the other model loaders are unchanged.
RUN python download_fracture_model.py

EXPOSE 7860

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "7860"]
