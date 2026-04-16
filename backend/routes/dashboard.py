"""Dashboard stats endpoint.
Returns aggregate statistics from the audit and feedback tables.
"""
from fastapi import APIRouter
from .. import database as db

router = APIRouter()


@router.get("/dashboard/stats")
async def stats():
    """Return aggregate audit statistics."""
    total_row = await db.fetch_one("SELECT COUNT(*) FROM audits")
    total = total_row[0] if total_row else 0

    avg_row = await db.fetch_one("SELECT AVG(trust_score) FROM audits")
    avg_trust = round(avg_row[0], 2) if avg_row and avg_row[0] else 0.0

    avg_bias_row = await db.fetch_one("SELECT AVG(bias_score) FROM audits")
    avg_bias = round(avg_bias_row[0], 4) if avg_bias_row and avg_bias_row[0] else 0.0

    avg_truth_row = await db.fetch_one("SELECT AVG(truth_score) FROM audits")
    avg_truth = round(avg_truth_row[0], 4) if avg_truth_row and avg_truth_row[0] else 0.0

    feedback_row = await db.fetch_one("SELECT COUNT(*) FROM feedback")
    total_feedback = feedback_row[0] if feedback_row else 0

    return {
        "total_audits": total,
        "avg_trust": avg_trust,
        "avg_bias": avg_bias,
        "avg_truth": avg_truth,
        "total_feedback": total_feedback,
    }


@router.get("/dashboard/recent")
async def recent():
    """Return the most recent audits."""
    rows = await db.list_audits(limit=20)
    return [
        {"audit_id": r[0], "input": r[1][:100], "trust_score": r[2], "created_at": r[3]}
        for r in rows
    ]


@router.get("/dashboard/trends")
async def trends():
    """Return trust score trend data (last 30 audits)."""
    rows = await db.fetch_all(
        "SELECT id, trust_score, bias_score, truth_score, created_at FROM audits ORDER BY created_at DESC LIMIT 30"
    )
    return [
        {"audit_id": r[0], "trust_score": r[1], "bias_score": r[2],
         "truth_score": r[3], "created_at": r[4]}
        for r in rows
    ]
