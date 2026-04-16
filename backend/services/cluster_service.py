'''backend/services/cluster_service.py'''
"""Cluster analysis utilities.
Provides KMeans clustering on feature vectors and per‑cluster bias metrics.
"""
import numpy as np
from sklearn.cluster import KMeans
from typing import List, Dict, Tuple

def cluster_features(X: np.ndarray, n_clusters: int = 4) -> Tuple[np.ndarray, np.ndarray]:
    """Run KMeans on the feature matrix X.
    Returns a tuple (labels, centroids).
    """
    kmeans = KMeans(n_clusters=n_clusters, random_state=0, n_init='auto')
    kmeans.fit(X)
    return kmeans.labels_, kmeans.cluster_centers_

def cluster_bias_analysis(
    X: np.ndarray,
    y: np.ndarray,
    protected_idx: int,
    n_clusters: int = 4,
) -> Tuple[float, List[Dict[str, float]]]:
    """Compute bias per cluster and return an overall cluster fairness score.
    The fairness score is the average of (1 - bias) across clusters.
    Returns (overall_score, per_cluster_details).
    """
    labels, _ = cluster_features(X, n_clusters)
    per_cluster = []
    scores = []
    for cluster_id in range(n_clusters):
        mask = labels == cluster_id
        if mask.sum() == 0:
            continue
        # Simple bias: difference in positive rate between protected groups within cluster
        protected = X[mask, protected_idx]
        # Train a quick logistic model on cluster data
        from sklearn.linear_model import LogisticRegression
        clf = LogisticRegression(max_iter=200, solver='liblinear')
        clf.fit(X[mask], y[mask])
        preds = clf.predict(X[mask])
        # demographic parity within cluster
        dp = abs(preds[protected == 0].mean() - preds[protected == 1].mean())
        # bias contribution (lower is better)
        bias = dp
        scores.append(1 - bias)  # higher is better
        per_cluster.append({"cluster_id": int(cluster_id), "bias": bias, "size": int(mask.sum())})
    overall = float(np.mean(scores)) if scores else 0.0
    return overall, per_cluster
