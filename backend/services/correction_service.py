"""Auto‑correction engine.
Provides functions to:
1. Remove / down‑weight biased features.
2. Replace hallucinated claims with cited facts.
3. Re‑run scoring to measure improvement.
"""
from typing import Dict, Any, List


def correct_bias(feature_importance: Dict[str, float], threshold: float = 0.25) -> Dict[str, Any]:
    """Identify biased features (importance > threshold) and suggest adjustments.
    Returns a dict with the list of flagged features and adjusted weights.
    """
    flagged = {k: v for k, v in feature_importance.items() if v > threshold}
    adjusted = {}
    for feat, imp in feature_importance.items():
        if feat in flagged:
            adjusted[feat] = round(imp * 0.5, 4)  # halve the weight
        else:
            adjusted[feat] = round(imp, 4)
    return {
        "flagged_features": list(flagged.keys()),
        "original_weights": feature_importance,
        "adjusted_weights": adjusted,
    }


def correct_truth(claim: str, citations: List[Dict[str, Any]]) -> str:
    """Replace the original claim with a corrected version built from the
    highest‑similarity citation.  If no citation scores above threshold
    the claim is returned unchanged with a warning prefix.
    """
    if not citations:
        return f"[UNVERIFIED] {claim}"

    best = max(citations, key=lambda c: c.get("similarity", 0))
    if best.get("similarity", 0) < 0.05:
        return f"[UNVERIFIED] {claim}"

    # Build a corrected sentence from the snippet
    snippet = best.get("snippet", "")
    corrected = f"[CORRECTED] According to {best.get('title', 'source')}: {snippet}"
    return corrected


def apply_corrections(audit_result: Dict[str, Any]) -> Dict[str, Any]:
    """Full correction pipeline.
    Accepts a raw audit result dict and returns a new dict with:
    - bias corrections (adjusted weights)
    - truth corrections (replaced claims)
    - a textual corrected output
    """
    corrections = {"bias_corrections": {}, "truth_corrections": "", "actions": []}

    # --- Bias correction ---
    feat_imp = audit_result.get("bias", {}).get("feature_importance", {})
    if feat_imp:
        bias_fix = correct_bias(feat_imp)
        corrections["bias_corrections"] = bias_fix
        if bias_fix["flagged_features"]:
            corrections["actions"].append({
                "type": "bias",
                "action": "adjust_weights",
                "details": f"Flagged features: {', '.join(bias_fix['flagged_features'])}",
            })

    # --- Truth correction ---
    citations = audit_result.get("truth", {}).get("citations", [])
    original_text = audit_result.get("input_text", "")
    corrected_text = correct_truth(original_text, citations)
    corrections["truth_corrections"] = corrected_text
    if corrected_text.startswith("[CORRECTED]"):
        corrections["actions"].append({
            "type": "truth",
            "action": "replace_claim",
            "details": "Replaced unverified claim with cited source.",
        })

    return corrections
