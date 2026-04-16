# Stage 1: Build & Python Dependencies
FROM python:3.9-slim as builder

WORKDIR /app
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Stage 2: Final Image
FROM python:3.9-slim

WORKDIR /app
COPY --from=builder /usr/local/lib/python3.9/site-packages /usr/local/lib/python3.9/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

# Copy source
COPY backend/ /app/backend/
COPY frontend/ /app/frontend/

# Set Python path to find the backend module
ENV PYTHONPATH=/app

# Expose FastAPI port
EXPOSE 8000

# Run FastAPI (which also serves the frontend statics)
CMD ["python", "-m", "uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
