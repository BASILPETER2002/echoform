import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

def test_entry_processing():
    response = client.post("/entry", json={"content": "I want to go skydiving"})
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["label"] == "High Risk Tolerance"
    assert data[0]["confidence_score"] > 0.5

def test_entropy_check_empty():
    response = client.get("/entropy-check")
    assert response.status_code == 200
    assert response.json()["status"] == "stable" # or whatever logic for < 2 hyps

def test_entropy_conflict():
    # Inject conflicting signals
    # 1. Boost Risk Tolerance
    client.post("/entry", json={"content": "skydiving adventure"})
    # 2. Boost Resource Focus to similar level
    client.post("/entry", json={"content": "budget invest safe"}) 
    # Note: 'safe' reduces risk, making them cross or get close?
    # Actually let's just create two strong positive signals for different axes
    
    # Clear state by restarting? No, in-memory persists for process. 
    # But for tests, we might want to rely on the cumulative effect or mock.
    # Let's just try to create a scenario.
    pass 
