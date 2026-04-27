"""Trust‑score calculation.
Uses the weighted formula defined in backend.config.
Now reads from get_active_weights() so runtime changes take effect immediately.
"""
from typing import Dict
from ..config import get_active_weights


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
    """Calculate the weighted trust score using the weighted_score core ML Addon.
    Reads weights from get_active_weights() so API-configured weights are respected.
    """
    active_weights = get_active_weights()
    bias_contrib = (1 - bias) 
    
    # Order must match between features and weights arrays
    features = [truth, bias_contrib, confidence, cluster, distribution]
    weights_array = [
        active_weights["truth"], 
        active_weights["bias"], 
        active_weights["confidence"], 
        active_weights["cluster"], 
        active_weights["distribution"]
    ]
    
    trust_score = weighted_score(features, weights_array)
    
    components = {
        "truth": truth * active_weights["truth"],
        "bias": bias_contrib * active_weights["bias"],
        "confidence": confidence * active_weights["confidence"],
        "cluster": cluster * active_weights["cluster"],
        "distribution": distribution * active_weights["distribution"],
    }
    
    trust_score = max(0.0, min(1.0, trust_score))
    result = {"trust_score": trust_score, **components}
    return result
