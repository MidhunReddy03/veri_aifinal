"""Feedback endpoint.
Stores human feedback and triggers weight recalibration when needed.
"""
from fastapi import APIRouter
from ..models import FeedbackEntry, FeedbackResponse
from ..services.feedback_service import store_feedback, get_feedback_history
from ..services.training_service import retrain_weights

router = APIRouter()


@router.post("/feedback", response_model=FeedbackResponse)
async def submit_feedback(entry: FeedbackEntry):
    """Store feedback and optionally trigger retraining."""
    await store_feedback(entry.audit_id, entry.correct, entry.bias_flag, entry.notes or "")
    # Check if retraining is warranted
    retrain_result = await retrain_weights()
    status = "received"
    if retrain_result.get("status") == "retrained":
        status = "received_and_retrained"
    return FeedbackResponse(status=status)


@router.get("/feedback/history")
async def feedback_history():
    """Return recent feedback entries."""
    history = await get_feedback_history()
    return history
