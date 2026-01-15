import sys
import os

# Add backend to path so we can import app
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from backend.app.models import Signal, Hypothesis, IdentityAxis
from uuid import uuid4
from datetime import datetime

def test_models():
    print("Testing models...")
    
    # Test Signal
    try:
        sig = Signal(
            axis=IdentityAxis.RISK_TOLERANCE,
            direction=0.5,
            weight=1.0
        )
        print(f"Signal created successfully: {sig}")
    except Exception as e:
        print(f"Failed to create Signal: {e}")
        return

    # Test Hypothesis
    try:
        hyp = Hypothesis(
            label="High Risk Tolerance",
            confidence_score=0.8,
            supporting_signals_ids=[sig.id]
        )
        print(f"Hypothesis created successfully: {hyp}")
    except Exception as e:
        print(f"Failed to create Hypothesis: {e}")
        return

    print("All model tests passed!")

if __name__ == "__main__":
    test_models()
