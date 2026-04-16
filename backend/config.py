'''backend/config.py'''
"""Configuration module for VeriAI backend.
Defines constants for trust score weighting, database path, and other
runtime settings. Centralizing these values makes it easy to swap
components (e.g., replace SQLite with Firestore) without touching the
service logic.
"""
import os
from pathlib import Path

# ---------------------------------------------------------------------------
# Database configuration
# ---------------------------------------------------------------------------
# SQLite file stored in the project root for local development.
BASE_DIR = Path(__file__).resolve().parent.parent
DB_PATH = os.getenv("VERIAI_DB_PATH", str(BASE_DIR / "veriai.db"))

# ---------------------------------------------------------------------------
# Trust score weighting (must sum to 1.0)
# ---------------------------------------------------------------------------
TRUST_WEIGHTS = {
    "truth": 0.35,
    "bias": 0.30,          # note: we use (1 - bias_score) in the formula
    "confidence": 0.15,
    "cluster": 0.10,
    "distribution": 0.10,
}

# ---------------------------------------------------------------------------
# Miscellaneous settings
# ---------------------------------------------------------------------------
# Minimum similarity threshold for RAG source relevance (cosine similarity)
RAG_SIMILARITY_THRESHOLD = 0.6

# Number of clusters for KMeans (can be overridden per request)
DEFAULT_NUM_CLUSTERS = 4

# Logging level – can be overridden via VERIAI_LOG_LEVEL env var
LOG_LEVEL = os.getenv("VERIAI_LOG_LEVEL", "INFO")

# ---------------------------------------------------------------------------
# Helper utilities (optional)
# ---------------------------------------------------------------------------
def get_db_path() -> str:
    """Return the absolute path to the SQLite database file.
    Allows callers to respect any runtime overrides.
    """
    return DB_PATH
