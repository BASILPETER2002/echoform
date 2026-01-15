import math
import torch
from backend.app.models import HypothesisSnapshot
from datetime import datetime
from typing import List, Dict, Optional
from sqlmodel import Session, select
from sentence_transformers import SentenceTransformer, util

from backend.app.models import Signal, Hypothesis, IdentityAxis

# Constants
HALF_LIFE_DAYS = 30
DECAY_CONSTANT = math.log(2) / HALF_LIFE_DAYS 
SIMILARITY_THRESHOLD = 0.6  # Only trigger signals for strong semantic matches

class SignalExtractor:
    """
    NLP-based engine using Sentence Embeddings to map intent to Identity Axes.
    """
    # Initialize the model (using a lightweight, fast model for CPU inference)
    model = SentenceTransformer('all-MiniLM-L6-v2')

    # Semantic Anchors: Phrases that represent clear signals for an axis
    ANCHORS = {
        # Social Battery Axis
        "I am feeling socially exhausted and need to be alone": (IdentityAxis.SOCIAL_BATTERY, -0.8),
        "I want to go out, meet people, and go to a party": (IdentityAxis.SOCIAL_BATTERY, 0.8),
        "I feel energized by spending time with my friends": (IdentityAxis.SOCIAL_BATTERY, 0.5),
        
        # Resource Focus Axis
        "I need to save money and stick to my budget": (IdentityAxis.RESOURCE_FOCUS, 0.7),
        "I am looking for ways to invest and grow my wealth": (IdentityAxis.RESOURCE_FOCUS, 0.9),
        "I want to spend money and buy something luxury": (IdentityAxis.RESOURCE_FOCUS, -0.6),

        # Risk Tolerance Axis
        "I want to take a big risk and try something dangerous": (IdentityAxis.RISK_TOLERANCE, 0.9),
        "I prefer to stay safe and avoid any unnecessary danger": (IdentityAxis.RISK_TOLERANCE, -0.8),
    }

    @classmethod
    def extract(cls, content: str) -> List[Signal]:
        signals = []
        if not content.strip():
            return signals

        # 1. Encode the user input
        input_embedding = cls.model.encode(content, convert_to_tensor=True)
        
        # 2. Compare against all anchors
        for anchor_text, (axis, direction) in cls.ANCHORS.items():
            anchor_embedding = cls.model.encode(anchor_text, convert_to_tensor=True)
            similarity = util.cos_sim(input_embedding, anchor_embedding).item()

            # 3. If the meaning is close enough, extract a signal
            if similarity > SIMILARITY_THRESHOLD:
                # We scale the weight by the similarity to reflect confidence
                signals.append(Signal(
                    axis=axis,
                    direction=direction,
                    weight=similarity 
                ))
        
        return signals

def calculate_temporal_decay(signal: Signal, current_time: datetime = None) -> float:
    if current_time is None:
        current_time = datetime.now()
    
    delta = current_time - signal.timestamp
    days_passed = delta.total_seconds() / 86400.0
    
    if days_passed < 0:
        days_passed = 0
        
    return signal.weight * math.exp(-DECAY_CONSTANT * days_passed)

class BeliefUpdater:
    @staticmethod
    def update_hypotheses(session: Session, signals: List[Signal], context: str = "normal") -> List[Hypothesis]:
        """
        Updated to handle the 'context' parameter from main.py.
        """
        # Group signals by axis
        signals_by_axis: Dict[IdentityAxis, List[Signal]] = {}
        for sig in signals:
            if sig.axis not in signals_by_axis:
                signals_by_axis[sig.axis] = []
            signals_by_axis[sig.axis].append(sig)
            
        updated_hypotheses = []

        # Resolve Clarification Context: If this is an answer to a clarifying question,
        # we can increase the learning rate to resolve the entropy faster.
        learning_rate = 0.2 if context == "clarification" else 0.1

        for axis, axis_signals in signals_by_axis.items():
            label = f"High {axis.value.replace('_', ' ').title()}"
            hyp = session.exec(select(Hypothesis).where(Hypothesis.label == label)).first()
            
            if not hyp:
                hyp = Hypothesis(label=label, confidence_score=0.5)
                session.add(hyp)
                session.flush() # Flush to get ID
            
            for sig in axis_signals:
                sig.hypothesis_id = hyp.id
                session.add(sig)

            # Weight the update by decay and importance
            net_impact = sum(calculate_temporal_decay(s) * s.direction for s in axis_signals)
            
            # Apply Bayesian-lite update
            hyp.confidence_score = max(
                0.0,
                min(1.0, hyp.confidence_score + (net_impact * learning_rate))
            )
            session.add(hyp)

            # ✅ ADD THIS RIGHT HERE (snapshot creation)
            snapshot = HypothesisSnapshot(
                hypothesis_id=hyp.id,
                confidence_score=hyp.confidence_score
            )
            session.add(snapshot)

            updated_hypotheses.append(hyp)
            
        session.commit()
        return updated_hypotheses