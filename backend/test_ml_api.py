import sys
from fastapi.testclient import TestClient
from backend.main import app
import time

client = TestClient(app)

print("1. Training the model (this will take a moment)...")
start = time.time()
train_res = client.post("/api/train")
print("Train Response:", train_res.json())
print(f"Time taken to train: {time.time() - start:.2f}s")

print("\n2. Bias Results:")
bias_res = client.get("/api/bias")
print(bias_res.json())

print("\n3. Fairness Results:")
fairness_res = client.get("/api/fairness")
print(fairness_res.json())

# Predict simple check
# Dummy data just to invoke endpoint correctly. Length must match one-hot encoded size.
# Since it's dynamic after get_dummies, we'll avoid the endpoint and rely on the model training and bias.
