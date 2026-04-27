"""Review Queue API — Human-in-the-Loop.
Manages the review queue for low-trust audit results.
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional

from .. import database as db

router = APIRouter()


class ReviewAction(BaseModel):
    notes: Optional[str] = Field("", description="Reviewer notes")


@router.get("/review/queue")
async def get_review_queue():
    """List all reviews (most recent first)."""
    rows = await db.get_pending_reviews(limit=50)
    return [
        {
            "id": r[0],
            "audit_id": r[1],
            "trust_score": r[2],
            "input_preview": r[3],
            "status": r[4],
            "reviewer_notes": r[5] or "",
            "created_at": r[6],
            "reviewed_at": r[7],
        }
        for r in rows
    ]


@router.get("/review/stats")
async def review_stats():
    """Return pending/approved/rejected counts."""
    return await db.get_review_stats()


@router.post("/review/{audit_id}/approve")
async def approve_review(audit_id: str, action: ReviewAction):
    """Approve a flagged audit result."""
    await db.update_review_status(audit_id, "approved", action.notes)
    return {"status": "success", "message": f"Audit {audit_id} approved.", "audit_id": audit_id}


@router.post("/review/{audit_id}/reject")
async def reject_review(audit_id: str, action: ReviewAction):
    """Reject a flagged audit result with notes."""
    if not action.notes:
        raise HTTPException(status_code=400, detail="Rejection requires reviewer notes.")
    await db.update_review_status(audit_id, "rejected", action.notes)
    return {"status": "success", "message": f"Audit {audit_id} rejected.", "audit_id": audit_id}


@router.post("/review/{audit_id}/escalate")
async def escalate_review(audit_id: str, action: ReviewAction):
    """Escalate a flagged audit for further investigation."""
    await db.update_review_status(audit_id, "escalated", action.notes)
    return {"status": "success", "message": f"Audit {audit_id} escalated.", "audit_id": audit_id}
