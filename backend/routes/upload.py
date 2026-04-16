"""CSV Upload endpoint.
Accepts a CSV file, parses it, and returns JSON or passes it to the audit engine.
"""
from fastapi import APIRouter, UploadFile, File
from pydantic import BaseModel
import pandas as pd
import io
import json

router = APIRouter()

@router.post("/upload-csv")
async def upload_csv(file: UploadFile = File(...)):
    """Upload and parse a CSV file."""
    content = await file.read()
    
    try:
        # Read the CSV 
        df = pd.read_csv(io.BytesIO(content))
        
        # We need features and labels. Let's assume the last column is the label if not specified,
        # or just return the entire parsed structure so the frontend/audit pipeline can process it.
        # Actually, let's format it in our expected exact JSON format for the Bias Scan.
        
        columns = df.columns.tolist()
        if len(columns) < 2:
            return {"error": "CSV must have at least 2 columns"}
            
        labels = df[columns[-1]].values.tolist()
        features = df[columns[:-1]].values.tolist()
        
        # Guess protected index: usually index 0 in our synthetic data, or we let the user specify.
        # We'll default to 0.
        
        dataset_json = {
            "features": features,
            "labels": labels,
            "feature_names": columns[:-1],
            "protected_index": 0
        }
        
        return {"status": "success", "filename": file.filename, "dataset": dataset_json}
        
    except Exception as e:
        return {"error": f"Failed to parse CSV: {str(e)}"}
