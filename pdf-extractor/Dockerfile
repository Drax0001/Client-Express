FROM python:3.13-slim

# Install system dependencies for OCR and PDF processing
RUN apt-get update && apt-get install -y --no-install-recommends \
    tesseract-ocr \
    poppler-utils \
    libgl1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install uv for fast Python package management
COPY --from=ghcr.io/astral-sh/uv:latest /uv /bin/uv

# Copy dependency files first for caching
COPY pyproject.toml uv.lock ./

# Install dependencies
RUN uv sync --frozen --no-dev

# Copy application code
COPY app.py extractors.py main.py ./

# Railway sets PORT automatically; default to 8080
ENV PORT=8080

EXPOSE ${PORT}

# Start the FastAPI server
CMD uv run uvicorn app:app --host 0.0.0.0 --port ${PORT}
