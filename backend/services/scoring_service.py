"""Trust‑score calculation.
Uses the weighted formula defined in backend.config.TRUST_WEIGHTS.
"""
from typing import Dict
from ..config import TRUST_WEIGHTS


def weighted_score(features: list, weights: list) -> float:
    """Implementation of ML Addon: y = sum(alpha_i * x_i)"""
    return sum(w * x for w, x in zip(weights, features))

def compute_trust_score(
    truth: float,
    bias: float,
    confidence: float,
    cluster: float,
    distribution: float,
) -> Dict[str, float]:
    """Calculate the weighted trust score using the weighted_score core ML Addon."""
    bias_contrib = (1 - bias) 
    
    # Order must match between features and weights arrays
    features = [truth, bias_contrib, confidence, cluster, distribution]
    weights_array = [
        TRUST_WEIGHTS["truth"], 
        TRUST_WEIGHTS["bias"], 
        TRUST_WEIGHTS["confidence"], 
        TRUST_WEIGHTS["cluster"], 
        TRUST_WEIGHTS["distribution"]
    ]
    
    trust_score = weighted_score(features, weights_array)
    
    components = {
        "truth": truth * TRUST_WEIGHTS["truth"],
        "bias": bias_contrib * TRUST_WEIGHTS["bias"],
        "confidence": confidence * TRUST_WEIGHTS["confidence"],
        "cluster": cluster * TRUST_WEIGHTS["cluster"],
        "distribution": distribution * TRUST_WEIGHTS["distribution"],
    }
    
    trust_score = max(0.0, min(1.0, trust_score))
    result = {"trust_score": trust_score, **components}
    return result
