"""Full audit endpoint — v2.0.
Accepts text / dataset input, runs the complete reasoning chain with
parallel processing and depth control, persists the result, and
returns the comprehensive audit report.
Automatically queues low-trust results for human review.
"""
from fastapi import APIRouter
from ..models import AuditRequest
from ..services.reasoning_chain import run_audit
from ..services.truth_service import invalidate_cache
from .. import database as db

router = APIRouter()


@router.post("/audit")
async def audit(request: AuditRequest):
    """Run the full multi-step audit pipeline with parallel processing."""
    # Invalidate truth cache to pick up any new KB entries
    invalidate_cache()

    result = await run_audit(
        input_text=request.input_text,
        num_clusters=request.num_clusters,
        depth=request.depth or "standard",
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

    # If flagged for human review, add to review queue
    if result.get("requires_human_review"):
        await db.insert_review(
            audit_id=result["audit_id"],
            trust_score=result["trust_score"],
            input_preview=result["input_text"][:200],
        )

    return result
