'''backend/database.py'''
"""Async SQLite helper for VeriAI.
Provides simple CRUD utilities and ensures tables are created on startup.
The design abstracts the DB so swapping to Firestore later is straightforward.
"""
import aiosqlite
from pathlib import Path
from .config import DB_PATH, LOG_LEVEL
import logging

logging.basicConfig(level=LOG_LEVEL)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Schema definitions (SQL)
# ---------------------------------------------------------------------------
SCHEMA = {
    "audits": """
        CREATE TABLE IF NOT EXISTS audits (
            id TEXT PRIMARY KEY,
            input TEXT NOT NULL,
            bias_score REAL,
            truth_score REAL,
            trust_score REAL,
            corrected TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    """,
    "logs": """
        CREATE TABLE IF NOT EXISTS logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            audit_id TEXT,
            issue TEXT,
            severity TEXT,
            resolved INTEGER DEFAULT 0,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    """,
    "feedback": """
        CREATE TABLE IF NOT EXISTS feedback (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            audit_id TEXT,
            correct INTEGER,
            bias_flag INTEGER,
            notes TEXT,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    """,
    "knowledge_base": """
        CREATE TABLE IF NOT EXISTS knowledge_base (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT,
            content TEXT,
            source TEXT
        );
    """,
}

async def init_db() -> None:
    """Create tables if they do not exist.
    Called from FastAPI startup event.
    """
    async with aiosqlite.connect(DB_PATH) as db:
        for name, stmt in SCHEMA.items():
            await db.execute(stmt)
            logger.debug(f"Ensured table {name} exists")
        await db.commit()

# ---------------------------------------------------------------------------
# Generic helpers
# ---------------------------------------------------------------------------
async def execute(query: str, params: tuple = ()) -> None:
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(query, params)
        await db.commit()

async def fetch_one(query: str, params: tuple = ()):
    async with aiosqlite.connect(DB_PATH) as db:
        async with db.execute(query, params) as cursor:
            row = await cursor.fetchone()
            return row

async def fetch_all(query: str, params: tuple = ()):
    async with aiosqlite.connect(DB_PATH) as db:
        async with db.execute(query, params) as cursor:
            rows = await cursor.fetchall()
            return rows

# Convenience wrappers for audit table
async def insert_audit(audit_id: str, input_text: str, bias_score: float = None,
                       truth_score: float = None, trust_score: float = None,
                       corrected: str = None) -> None:
    await execute(
        "INSERT INTO audits (id, input, bias_score, truth_score, trust_score, corrected) VALUES (?, ?, ?, ?, ?, ?)",
        (audit_id, input_text, bias_score, truth_score, trust_score, corrected),
    )

async def get_audit(audit_id: str):
    row = await fetch_one("SELECT * FROM audits WHERE id = ?", (audit_id,))
    return row

async def list_audits(limit: int = 20):
    rows = await fetch_all("SELECT id, input, trust_score, created_at FROM audits ORDER BY created_at DESC LIMIT ?", (limit,))
    return rows
