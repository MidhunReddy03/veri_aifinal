"""Report retrieval endpoint.
Returns the full audit record from the database.
"""
from fastapi import APIRouter
from .. import database as db

router = APIRouter()


@router.get("/report/{audit_id}")
async def get_report(audit_id: str):
    """Retrieve a stored audit report by ID."""
    row = await db.get_audit(audit_id)
    if not row:
        return {"error": "Audit not found"}
    return {
        "audit_id": row[0],
        "input": row[1],
        "bias_score": row[2],
        "truth_score": row[3],
        "trust_score": row[4],
        "corrected": row[5],
        "created_at": row[6],
    }
