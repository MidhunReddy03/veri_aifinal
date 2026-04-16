"""Feedback loop.
Stores human feedback, computes aggregated approval rates, and provides
a mechanism to adjust the trust‑score weights based on cumulative
feedback.
"""
import aiosqlite
from ..config import DB_PATH, TRUST_WEIGHTS
from typing import Dict, Any, List
import copy


async def store_feedback(audit_id: str, correct: bool, bias_flag: bool, notes: str = "") -> str:
    """Persist a single feedback entry and return 'ok'."""
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            "INSERT INTO feedback (audit_id, correct, bias_flag, notes) VALUES (?, ?, ?, ?)",
            (audit_id, int(correct), int(bias_flag), notes),
        )
        await db.commit()
    return "ok"


async def get_feedback_history(limit: int = 50) -> List[Dict[str, Any]]:
    """Return recent feedback entries."""
    async with aiosqlite.connect(DB_PATH) as db:
        async with db.execute(
            "SELECT id, audit_id, correct, bias_flag, notes, timestamp FROM feedback ORDER BY timestamp DESC LIMIT ?",
            (limit,),
        ) as cursor:
            rows = await cursor.fetchall()
    return [
        {"id": r[0], "audit_id": r[1], "correct": bool(r[2]),
         "bias_flag": bool(r[3]), "notes": r[4], "timestamp": r[5]}
        for r in rows
    ]


async def compute_weight_adjustments() -> Dict[str, float]:
    """Analyse feedback and propose weight adjustments.
    If users frequently flag bias issues, increase the bias weight.
    If users frequently mark outputs as incorrect, increase truth weight.
    Returns a new weight dict (does not mutate the global config).
    """
    async with aiosqlite.connect(DB_PATH) as db:
        async with db.execute("SELECT COUNT(*) FROM feedback") as cur:
            total = (await cur.fetchone())[0]
        if total == 0:
            return dict(TRUST_WEIGHTS)
        async with db.execute("SELECT COUNT(*) FROM feedback WHERE bias_flag = 1") as cur:
            bias_flags = (await cur.fetchone())[0]
        async with db.execute("SELECT COUNT(*) FROM feedback WHERE correct = 0") as cur:
            incorrect = (await cur.fetchone())[0]

    new_weights = copy.deepcopy(TRUST_WEIGHTS)
    bias_ratio = bias_flags / total
    incorrect_ratio = incorrect / total

    # Increase bias weight if many bias flags
    if bias_ratio > 0.3:
        new_weights["bias"] = min(new_weights["bias"] + 0.05, 0.5)
    # Increase truth weight if many incorrect flags
    if incorrect_ratio > 0.3:
        new_weights["truth"] = min(new_weights["truth"] + 0.05, 0.5)

    # Re‑normalise so weights sum to 1
    total_w = sum(new_weights.values())
    new_weights = {k: round(v / total_w, 4) for k, v in new_weights.items()}
    return new_weights
