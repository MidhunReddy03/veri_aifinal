# VeriAI — AI Trust Auditor Platform

VeriAI is a comprehensive, production-ready AI governance platform designed to detect, score, explain, and correct bias and hallucinations in AI systems. 

## Features

1. **Bias Detection**: Statistical fairness measurements (Demographic Parity, Equalized Odds) and feature importance using permutation testing.
2. **Truth Verification**: Custom Retrieval-Augmented Generation (RAG) using TF-IDF and cosine similarity against a local knowledge base.
3. **Cluster & Distribution Analysis**: KMeans clustering for sub-group fairness checks and statistical distribution stability monitoring.
4. **Auto-Correction Engine**: Automatically adjust weights for biased features and replace unverified claims with factual citations.
5. **Human Feedback Loop**: Collect human assessments on audits to recalibrate the overall Trust Score weighting system automatically.
6. **Premium Dashboard**: Dark-themed, glassmorphism UI with animated gauges, interactive charts, and a real-time audit pipeline visualizer.
7. **LLM Output Auditing**: Dedicated endpoint for prompt/output auditing with claim-level hallucination detection and trust delta after auto-correction.
8. **Compliance Export**: Download report artifacts in JSON and PDF with citations, reasoning steps, and reviewer trail.
9. **Portability-safe Explainability**: SHAP-first with automatic LIME/coefficient fallback for environments where SHAP wheels are unavailable.

## Architecture

- **Backend**: FastAPI (Python), asynchronous, modular ML services.
- **Frontend**: Vanilla HTML/CSS/JS SPA, styling via custom CSS variables, no heavy framework dependencies.
- **Data Persistence**: Asynchronous SQLite (`aiosqlite`) designed for easy migration to cloud databases like Firestore.

## Getting Started (Local Development)

### Prerequisites
- Python 3.9+
- Node.js (Optional, just for simple local HTTP servers if needed)

### 1. Install Backend Dependencies
```bash
cd veriai
python -m venv venv
source venv/bin/activate
pip install -r backend/requirements.txt
```

### 2. Run the Full Stack
The FastAPI app serves the API *and* the static frontend files.
```bash
# This automatically creates the DB and seeds it with demo data!
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```

### 3. Open the Dashboard
Open your browser and navigate to:
**http://127.0.0.1:8000/**

## Getting Started (Docker)

To run everything in a containerized environment:

```bash
cd veriai
docker-compose up --build
```
Access the dashboard at `http://localhost:8000`.

## API Documentation
Once the server is running, the Swagger UI documentation is available at:
- Swagger UI: `http://127.0.0.1:8000/docs`
- ReDoc: `http://127.0.0.1:8000/redoc`

## New API Additions

- `POST /api/audit-llm-output` — audits prompt + LLM output for hallucinations.
- `GET /api/reports/{audit_id}/export?format=json|pdf` — compliance artifact export.
- `GET /api/dashboard/fairness-drift` — fairness drift signal over recent audits.
- `GET /api/dashboard/model-comparison` — model-vs-model fairness/accuracy comparison on same dataset.
