"""Full audit endpoint.
Accepts text / dataset input, runs the complete reasoning chain,
persists the result, and returns the comprehensive audit report.
"""
from fastapi import APIRouter
from ..models import AuditRequest
from ..services.reasoning_chain import run_audit
from ..services.truth_service import invalidate_cache
from .. import database as db

router = APIRouter()


@router.post("/audit")
async def audit(request: AuditRequest):
    """Run the full 7‑step audit pipeline."""
    # Invalidate truth cache to pick up any new KB entries
    invalidate_cache()

    result = run_audit(
        input_text=request.input_text,
        num_clusters=request.num_clusters,
    )

    # Persist to SQLite
    await db.insert_audit(
        audit_id=result["audit_id"],
        input_text=result["input_text"],
        bias_score=result["bias"]["bias_score"],
        truth_score=result["truth"]["truth_score"],
        trust_score=result["trust_score"],
        corrected=result.get("corrections", ""),
    )

    return result
