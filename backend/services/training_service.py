"""Training / retraining service.
Monitors feedback volume and triggers model weight recalibration when
enough feedback has accumulated.
"""
import aiosqlite
from ..config import DB_PATH
from .feedback_service import compute_weight_adjustments
from typing import Dict, Any

RETRAIN_THRESHOLD = 10  # minimum feedback entries before considering retrain


async def should_retrain() -> bool:
    """Check whether the feedback volume exceeds the retrain threshold."""
    async with aiosqlite.connect(DB_PATH) as db:
        async with db.execute("SELECT COUNT(*) FROM feedback") as cur:
            count = (await cur.fetchone())[0]
    return count >= RETRAIN_THRESHOLD


async def retrain_weights() -> Dict[str, Any]:
    """Trigger a weight recalibration if there is enough feedback.
    Returns a dict with the new weights or a message saying retraining
    is not yet needed.
    """
    if not await should_retrain():
        return {"status": "skipped", "reason": "Not enough feedback yet"}

    new_weights = await compute_weight_adjustments()
    return {
        "status": "retrained",
        "new_weights": new_weights,
    }
