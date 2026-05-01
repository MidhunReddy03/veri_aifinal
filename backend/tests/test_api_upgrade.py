from fastapi.testclient import TestClient

from backend.main import app


def test_invalid_json_dataset_returns_400():
    with TestClient(app) as client:
        res = client.post("/api/audit", json={"input_text": '{"features":[[1,2]],"labels":[1]'})
    assert res.status_code == 400
    assert "Invalid JSON payload" in res.json()["detail"]


def test_llm_output_audit_returns_claims():
    payload = {
        "model_name": "gpt-4.1",
        "prompt": "Give two facts about Paris.",
        "output_text": "Paris is the capital of France. Paris was founded by aliens in 1234.",
    }
    with TestClient(app) as client:
        res = client.post("/api/audit-llm-output", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["audit_type"] == "llm"
    assert data["total_claim_count"] >= 1
    assert "trust_delta" in data


def test_report_export_json_and_pdf():
    payload = {
        "model_name": "gpt-4.1",
        "prompt": "Give one fact about AI fairness.",
        "output_text": "Demographic parity checks positive prediction rate parity.",
    }
    with TestClient(app) as client:
        created = client.post("/api/audit-llm-output", json=payload).json()
        audit_id = created["audit_id"]

        json_export = client.get(f"/api/reports/{audit_id}/export?format=json")
        assert json_export.status_code == 200
        assert json_export.json()["audit_id"] == audit_id

        pdf_export = client.get(f"/api/reports/{audit_id}/export?format=pdf")
        assert pdf_export.status_code == 200
        assert pdf_export.headers["content-type"].startswith("application/pdf")
