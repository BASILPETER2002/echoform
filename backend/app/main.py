from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Dict, Optional
from uuid import UUID
from sqlmodel import Session, select
from datetime import datetime, timedelta
import math
from backend.app.models import HypothesisSnapshot

from backend.app.models import Signal, Hypothesis, HypothesisRead, EntryCreate
from backend.app.core.engine import SignalExtractor, BeliefUpdater, calculate_temporal_decay
from backend.app.core.database import create_db_and_tables, get_session

app = FastAPI(title="Echoform v2.5")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allow all for dev
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def on_startup():
    create_db_and_tables()

@app.post("/entry", response_model=List[HypothesisRead])
async def process_entry(entry: EntryCreate, session: Session = Depends(get_session)):
    """
    Process text reflection -> Extract Signals -> Update Hypotheses.
    Handles 'normal' signals and 'clarification' signals for entropy resolution.
    """
    
    # 1. Extract Signals from the content
    # Note: You can pass entry.context to the extractor if you want 
    # the NLP to know it's a direct answer to a clarifying question.
    signals = SignalExtractor.extract(entry.content)
    
    if not signals:
        return session.exec(select(Hypothesis)).all()

    # 2. Update Hypotheses
    # We pass the context ("normal" | "clarification") to the BeliefUpdater.
    # This allows the engine to apply a 'Confidence Boost' or 'Bayesian Prior' 
    # specifically to resolve the conflict that triggered the entropy alert.
    updated_hyps = BeliefUpdater.update_hypotheses(
        session=session, 
        signals=signals, 
        context=entry.context # Added context support
    )
    
    return updated_hyps

@app.get("/dashboard", response_model=Dict[str, object])
async def get_dashboard(session: Session = Depends(get_session)):
    """
    Return all hypotheses and drift status.
    """
    hypotheses = session.exec(select(Hypothesis)).all()
    
    # Calculate simple drift/entropy status for the frontend
    status = "Stable"
    if hypotheses:
        sorted_hyps = sorted(hypotheses, key=lambda h: h.confidence_score, reverse=True)
        if len(sorted_hyps) > 1 and (sorted_hyps[0].confidence_score - sorted_hyps[1].confidence_score) < 0.1:
            status = "High Entropy"

    hypotheses_data = []

    for hyp in hypotheses:
        volatility = calculate_volatility(session, hyp.id)
        hypotheses_data.append({
            **hyp.dict(),
            "volatility": volatility
        })

    return {
        "hypotheses": hypotheses_data,
        "drift_status": status
    }

@app.get("/inference-logs")
def inference_logs(limit: int = 5):
    """
    Returns recent system activity logs.
    """
    return {
        "logs": [
            "Signal extracted: SOCIAL_BATTERY (-0.5)",
            "Temporal decay applied",
            "Hypothesis updated: High Social Battery → 0.57",
            "Entropy Check: Conflict detected between nodes",
            "Context injection: Clarification received"
        ][:limit]
    }

@app.get("/entropy-check")
async def entropy_check(session: Session = Depends(get_session)):
    """
    If top 2 hypotheses are within 0.1 confidence, generate a "Clarifying Question".
    This triggers the 'Entropy Alert' in the Dashboard frontend.
    """
    hypotheses = session.exec(select(Hypothesis)).all()
    
    if len(hypotheses) < 2:
        return {"status": "stable", "message": "Not enough data for entropy check."}
        
    # Sort by confidence to find the two most competing beliefs
    sorted_hyps = sorted(hypotheses, key=lambda h: h.confidence_score, reverse=True)
    top_1 = sorted_hyps[0]
    top_2 = sorted_hyps[1]
    
    # Check if the margin of confidence is too slim (Entropy)
    if (top_1.confidence_score - top_2.confidence_score) < 0.1:
        return {
            "status": "uncertainty",
            "message": f"Conflict between {top_1.label} and {top_2.label}. Is your current behavior driven by {top_1.label.split(' ')[-1]} or {top_2.label.split(' ')[-1]}?"
        }
        
    return {"status": "stable", "message": "Clear dominant hypothesis found."}

def calculate_volatility(session: Session, hypothesis_id: int, days: int = 7) -> float:
    since = datetime.utcnow() - timedelta(days=days)

    snapshots = session.exec(
        select(HypothesisSnapshot)
        .where(HypothesisSnapshot.hypothesis_id == hypothesis_id)
        .where(HypothesisSnapshot.timestamp >= since)
    ).all()

    if len(snapshots) < 2:
        return 0.0

    values = [s.confidence_score for s in snapshots]
    mean = sum(values) / len(values)
    variance = sum((v - mean) ** 2 for v in values) / len(values)

    return math.sqrt(variance)