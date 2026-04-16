'''backend/services/fairness_service.py'''
"""Bias detection utilities.
Provides:
- Demographic parity
- Equalized odds
- Permutation‑importance based feature importance (SHAP‑like)
All functions operate on NumPy arrays for speed and avoid heavy dependencies.
"""
import numpy as np
from sklearn.metrics import confusion_matrix
from sklearn.inspection import permutation_importance
from sklearn.linear_model import LogisticRegression
from typing import List, Tuple, Dict


def demographic_parity(y_pred: np.ndarray, protected: np.ndarray) -> float:
    """Calculate absolute difference in positive prediction rates between
    protected groups (binary protected attribute).
    Returns a value in [0, 1] where 0 means perfect parity.
    """
    # Assume protected values are 0/1
    group0_rate = y_pred[protected == 0].mean()
    group1_rate = y_pred[protected == 1].mean()
    return abs(group0_rate - group1_rate)


def equalized_odds(y_true: np.ndarray, y_pred: np.ndarray, protected: np.ndarray) -> float:
    """Calculate the maximum absolute difference in true‑positive rates
    across protected groups. Returns a value in [0, 1].
    """
    def tpr(mask):
        tn, fp, fn, tp = confusion_matrix(y_true[mask], y_pred[mask], labels=[0, 1]).ravel()
        return tp / (tp + fn) if (tp + fn) > 0 else 0.0
    tpr0 = tpr(protected == 0)
    tpr1 = tpr(protected == 1)
    return abs(tpr0 - tpr1)


def feature_importance(X: np.ndarray, y: np.ndarray, feature_names: List[str]) -> Dict[str, float]:
    """Train a simple logistic regression model and compute permutation
    importance for each feature. Returns a dict mapping feature name → importance.
    The importance values are normalised to sum to 1.
    """
    model = LogisticRegression(max_iter=200, solver="liblinear")
    model.fit(X, y)
    result = permutation_importance(model, X, y, n_repeats=5, random_state=0)
    importances = result.importances_mean
    total = importances.sum()
    if total == 0:
        normalized = np.zeros_like(importances)
    else:
        normalized = importances / total
    return {name: float(val) for name, val in zip(feature_names, normalized)}


def compute_bias_score(
    X: np.ndarray,
    y: np.ndarray,
    protected_idx: int,
    feature_names: List[str],
) -> Tuple[float, Dict[str, float], float, float]:
    """High‑level helper that returns:
    - overall bias score (0‑1, lower is better)
    - feature importance dict
    - demographic parity value
    - equalized odds value
    The overall bias score is the average of the two fairness metrics.
    """
    protected = X[:, protected_idx]
    # Simple classifier for predictions (logistic regression)
    clf = LogisticRegression(max_iter=200, solver="liblinear")
    clf.fit(X, y)
    y_pred = clf.predict(X)
    dp = demographic_parity(y_pred, protected)
    eo = equalized_odds(y, y_pred, protected)
    bias_score = (dp + eo) / 2.0  # 0 = perfect, 1 = worst
    feat_imp = feature_importance(X, y, feature_names)
    return bias_score, feat_imp, dp, eo
