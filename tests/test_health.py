from fastapi.testclient import TestClient
from app import app

client = TestClient(app)


def test_health_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["app"] == "Aarohi AI"
    assert "model_configured" in data


def test_homepage_serves_html():
    response = client.get("/")
    assert response.status_code == 200
    assert "Aarohi AI" in response.text
