"""VeriAI — FastAPI application entry point.
Registers all routers, initialises the database, seeds data, and
serves the frontend as static files.
"""
import uvicorn
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path

from .routes import audit, feedback, dashboard, bias_scan, truth_check, correction, report, upload, ml, settings, review
from .database import init_db
from .seed_data import seed_database


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown lifecycle."""
    # --- Startup ---
    await init_db()
    seed_database()
    yield
    # --- Shutdown ---


app = FastAPI(
    title="VeriAI AI Trust Auditor",
    version="1.0.0",
    description="Detect, score, explain, and correct bias and hallucinations in AI systems.",
    lifespan=lifespan,
)

# CORS for local dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ----- API routers -----
app.include_router(audit.router, prefix="/api", tags=["Audit"])
app.include_router(bias_scan.router, prefix="/api", tags=["Bias"])
app.include_router(truth_check.router, prefix="/api", tags=["Truth"])
app.include_router(correction.router, prefix="/api", tags=["Correction"])
app.include_router(report.router, prefix="/api", tags=["Report"])
app.include_router(upload.router, prefix="/api", tags=["Upload"])
app.include_router(feedback.router, prefix="/api", tags=["Feedback"])
app.include_router(dashboard.router, prefix="/api", tags=["Dashboard"])
app.include_router(ml.router, prefix="/api", tags=["ML"])
app.include_router(settings.router, prefix="/api", tags=["Settings"])
app.include_router(review.router, prefix="/api", tags=["Review"])

# ----- Serve frontend static files -----
frontend_dir = Path(__file__).resolve().parent.parent / "frontend"
if frontend_dir.exists():
    app.mount("/", StaticFiles(directory=str(frontend_dir), html=True), name="frontend")


@app.get("/health", include_in_schema=False)
def health_check():
    return {"status": "ok"}

