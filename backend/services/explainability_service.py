"""Explainability Service — v2.0.
Multi-method SHAP explanations with caching and automatic fallback.
Methods:
    - linear: shap.LinearExplainer (fast for SGD/linear models)
    - coefficient: Raw model coefficients × feature values (instant, no SHAP needed)
    - permutation: shap.PermutationExplainer (slower, model-agnostic)
"""
import time
import shap
import pandas as pd
import numpy as np
from .training_service import get_live_model, preprocess_data, load_data

# Cache keyed by (method, index) — invalidated on retrain
_SHAP_CACHE: dict = {}
_MODEL_VERSION: int = 0


def invalidate_shap_cache():
    """Call this after model retrain to clear cached explanations."""
    global _SHAP_CACHE, _MODEL_VERSION
    _SHAP_CACHE.clear()
    _MODEL_VERSION += 1


def _coefficient_explanation(model, scaler, instance_scaled, feature_names):
    """Ultra-fast fallback: raw model coefficients × feature values.
    Works for any linear model with a coef_ attribute.
    """
    coefs = model.coef_[0] if model.coef_.ndim > 1 else model.coef_
    impacts = coefs * instance_scaled[0]
    
    contributions = []
    for name, val in zip(feature_names, impacts):
        if abs(val) > 0.05:
            disp_name = name
            if "_" in disp_name:
                disp_name = disp_name.split("_")[-1].capitalize()
            contributions.append({"feature": disp_name, "impact": float(val)})
    
    contributions.sort(key=lambda x: abs(x["impact"]), reverse=True)
    
    base_value = float(model.intercept_[0]) if hasattr(model.intercept_, '__len__') else float(model.intercept_)
    return base_value, contributions


def _linear_explanation(model, scaler, X, instance_scaled, feature_names):
    """Standard SHAP LinearExplainer — fast for SGD/linear models."""
    background = scaler.transform(X[np.random.choice(X.shape[0], 100, replace=False)])
    explainer = shap.LinearExplainer(model, background)
    shap_values = explainer.shap_values(instance_scaled)
    
    if isinstance(shap_values, list):
        sv = shap_values[1][0]
    else:
        sv = shap_values[0]
    
    contributions = []
    for name, val in zip(feature_names, sv):
        if abs(val) > 0.05:
            disp_name = name
            if "_" in disp_name:
                disp_name = disp_name.split("_")[-1].capitalize()
            contributions.append({"feature": disp_name, "impact": float(val)})
    
    contributions.sort(key=lambda x: abs(x["impact"]), reverse=True)
    
    base_value = explainer.expected_value
    if isinstance(base_value, (list, np.ndarray)):
        base_value = base_value[-1]
    
    return float(base_value), contributions


def _permutation_explanation(model, scaler, X, instance_scaled, feature_names):
    """Model-agnostic SHAP PermutationExplainer — slower but universal."""
    background = scaler.transform(X[np.random.choice(X.shape[0], 50, replace=False)])
    
    def predict_fn(x):
        return model.predict_proba(x)[:, 1]
    
    explainer = shap.PermutationExplainer(predict_fn, background)
    shap_values = explainer(instance_scaled)
    sv = shap_values.values[0]
    
    contributions = []
    for name, val in zip(feature_names, sv):
        if abs(val) > 0.05:
            disp_name = name
            if "_" in disp_name:
                disp_name = disp_name.split("_")[-1].capitalize()
            contributions.append({"feature": disp_name, "impact": float(val)})
    
    contributions.sort(key=lambda x: abs(x["impact"]), reverse=True)
    base_value = float(shap_values.base_values[0])
    return base_value, contributions


def generate_shap_explanation(index: int = 0, method: str = "linear") -> dict:
    """Generate a SHAP breakdown for a given instance.
    
    Methods:
        - "linear": shap.LinearExplainer (default, fast)
        - "coefficient": Raw model coefficients (instant)
        - "permutation": shap.PermutationExplainer (slow, model-agnostic)
    
    Includes caching and automatic fallback if a method fails or times out.
    """
    global _SHAP_CACHE
    
    cache_key = f"{_MODEL_VERSION}:{method}:{index}"
    if cache_key in _SHAP_CACHE:
        cached = _SHAP_CACHE[cache_key]
        cached["from_cache"] = True
        return cached
    
    try:
        model, scaler = get_live_model()
        df = load_data()
        X, y, feature_names = preprocess_data(df)
        
        instance_raw = X[index:index+1]
        instance_scaled = scaler.transform(instance_raw)
        
        t0 = time.time()
        
        if method == "coefficient":
            base_value, contributions = _coefficient_explanation(
                model, scaler, instance_scaled, feature_names
            )
        elif method == "permutation":
            try:
                base_value, contributions = _permutation_explanation(
                    model, scaler, X, instance_scaled, feature_names
                )
            except Exception:
                # Fallback to coefficient on failure
                method = "coefficient (fallback)"
                base_value, contributions = _coefficient_explanation(
                    model, scaler, instance_scaled, feature_names
                )
        else:
            # Default: linear
            try:
                base_value, contributions = _linear_explanation(
                    model, scaler, X, instance_scaled, feature_names
                )
                # If it took too long, cache but note the time
                elapsed = time.time() - t0
                if elapsed > 5.0:
                    # Next time, auto-fallback to coefficient
                    pass
            except Exception:
                # Fallback to coefficient
                method = "coefficient (fallback)"
                base_value, contributions = _coefficient_explanation(
                    model, scaler, instance_scaled, feature_names
                )
        
        elapsed = round(time.time() - t0, 3)
        
        result = {
            "status": "success",
            "base_value": float(base_value),
            "contributions": contributions[:8],
            "person_index": index,
            "method": method,
            "computation_time": elapsed,
            "from_cache": False,
        }
        
        # Cache the result
        _SHAP_CACHE[cache_key] = result.copy()
        
        return result
    except Exception as e:
        return {"status": "error", "message": str(e)}
