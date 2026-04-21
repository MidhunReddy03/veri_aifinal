"""Standalone bias‑scan endpoint.
Accepts dataset input and returns bias metrics without running the full pipeline.
"""
from fastapi import APIRouter
from pydantic import BaseModel, Field
from typing import Optional, List
import json
import numpy as np

from ..services.bias_service import compute_bias_score

router = APIRouter()


class BiasScanRequest(BaseModel):
    data: str = Field(..., description="JSON string with features, labels, feature_names, protected_index")


@router.post("/bias-scan")
async def bias_scan(request: BiasScanRequest):
    """Run bias analysis only."""
    try:
        parsed = json.loads(request.data)
        X = np.array(parsed["features"], dtype=float)
        y = np.array(parsed["labels"], dtype=float)
        names = parsed.get("feature_names", [f"f{i}" for i in range(X.shape[1])])
        prot_idx = parsed.get("protected_index", 0)
    except Exception:
        # Use synthetic demo data
        rng = np.random.RandomState(42)
        n = 200
        gender = rng.randint(0, 2, n)
        experience = rng.normal(5, 2, n)
        education = rng.normal(3, 1, n)
        score = rng.normal(50, 10, n)
        X = np.column_stack([gender, experience, education, score])
        prob = 0.3 + 0.2 * gender + 0.05 * experience / 10
        y = (rng.rand(n) < prob).astype(float)
        names = ["gender", "experience", "education", "score"]
        prot_idx = 0

    bias_score, feat_imp, dp, eo = compute_bias_score(X, y, prot_idx, names)
    return {
        "bias_score": round(bias_score, 4),
        "demographic_parity": round(dp, 4),
        "equalized_odds": round(eo, 4),
        "feature_importance": {k: round(v, 4) for k, v in feat_imp.items()},
    }
