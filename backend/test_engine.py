import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from datetime import datetime, timedelta
from backend.app.core.engine import SignalExtractor, calculate_temporal_decay, BeliefUpdater
from backend.app.models import Signal, IdentityAxis, Hypothesis

def test_signal_extractor():
    content = "I am so tired but also want to invest my money."
    signals = SignalExtractor.extract(content)
    
    assert len(signals) == 2
    
    # Check for Social Battery
    assert any(s.axis == IdentityAxis.SOCIAL_BATTERY and s.direction == -0.5 for s in signals)
    # Check for Resource Focus
    assert any(s.axis == IdentityAxis.RESOURCE_FOCUS and s.direction == 0.6 for s in signals)

def test_temporal_decay():
    sig = Signal(axis=IdentityAxis.RISK_TOLERANCE, direction=1.0, weight=1.0)
    
    # Immediate
    assert calculate_temporal_decay(sig, sig.timestamp) == 1.0
    
    # 30 days later
    future = sig.timestamp + timedelta(days=30)
    decayed = calculate_temporal_decay(sig, future)
    assert 0.49 < decayed < 0.51 # Approx 0.5

def test_belief_updater():
    # Setup
    sig1 = Signal(axis=IdentityAxis.SOCIAL_BATTERY, direction=-0.5, weight=1.0)
    sig2 = Signal(axis=IdentityAxis.SOCIAL_BATTERY, direction=-0.8, weight=1.0)
    
    initial_hyps = {}
    
    # First update
    updated = BeliefUpdater.update_hypotheses([sig1], initial_hyps)
    hyp = list(updated.values())[0]
    first_conf = hyp.confidence_score
    assert hyp.label == "High Social Battery"
    # Prior 0.5 + (-0.5 * 1.0 * 0.1) = 0.45
    assert 0.44 < hyp.confidence_score < 0.46
    
    # Second update
    updated_2 = BeliefUpdater.update_hypotheses([sig2], updated)
    hyp_2 = list(updated_2.values())[0]
    # Prior ~0.45 + (-0.8 * 1.0 * 0.1) = 0.37
    assert hyp_2.confidence_score < first_conf

