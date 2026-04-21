"""Explainability Service via SHAP.
Returns feature level contribution logic for a single data instance mapping.
"""
import shap
import pandas as pd
import numpy as np
from .training_service import get_live_model, preprocess_data, load_data

def generate_shap_explanation(index: int = 0) -> dict:
    """Generate a SHAP breakdown for a given simulated or real person.
    By default, we will grab applicant #0 for the test simulation.
    """
    try:
        model, scaler = get_live_model()
        df = load_data()
        X, y, feature_names = preprocess_data(df)
        
        # We will explain the instance at the requested index
        # Usually SHAP uses a background dataset for SGD/Linear models
        # We sample 100 rows for the background distribution to keep it fast
        background = scaler.transform(X[np.random.choice(X.shape[0], 100, replace=False)])
        
        # Grab the specific instance to explain
        instance_raw = X[index:index+1]
        instance_scaled = scaler.transform(instance_raw)
        
        # Linear models can use the LinearExplainer, which is extremely fast
        # SGDClassifier with log_loss is just a LogisticRegression
        explainer = shap.LinearExplainer(model, background)
        shap_values = explainer.shap_values(instance_scaled)
        
        # If binary classification, shap_values might be a list or direct array
        if isinstance(shap_values, list):
            sv = shap_values[1][0]  # Get positive class explanations
        else:
            sv = shap_values[0]
            
        # Match SHAP values to feature names
        contributions = []
        for name, val in zip(feature_names, sv):
            # Only send impactful features to the UI to avoid clutter
            if abs(val) > 0.05:
                # Provide a UI-friendly mapping
                disp_name = name
                # Clean up dummy-encoded names purely for demo aesthetics
                if "_" in disp_name:
                    disp_name = disp_name.split("_")[-1].capitalize()
                
                contributions.append({
                    "feature": disp_name,
                    "impact": float(val)
                })
                
        # Sort by absolute impact descending
        contributions.sort(key=lambda x: abs(x["impact"]), reverse=True)
        
        # Calculate Base Value correctly from explainer
        base_value = explainer.expected_value
        if isinstance(base_value, (list, np.ndarray)):
            base_value = base_value[-1]
            
        return {
            "status": "success",
            "base_value": float(base_value),
            "contributions": contributions[:8], # Send top 8 features to the dashboard
            "person_index": index
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}
