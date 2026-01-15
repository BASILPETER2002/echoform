from datetime import datetime
from enum import Enum
from typing import List, Optional
from uuid import UUID, uuid4
from sqlmodel import SQLModel, Field, Relationship

class IdentityAxis(str, Enum):
    RISK_TOLERANCE = "risk_tolerance"
    SOCIAL_BATTERY = "social_battery"
    RESOURCE_FOCUS = "resource_focus"

# Signal Models
class SignalBase(SQLModel):
    timestamp: datetime = Field(default_factory=datetime.now)
    axis: IdentityAxis
    direction: float = Field(..., ge=-1.0, le=1.0, description="Direction of the signal, between -1 and 1")
    weight: float = Field(..., gt=0.0, description="Initial weight of the signal")
    decay_factor: float = Field(default=0.023, description="Decay factor for temporal decay (approx 30-day half-life)")

class Signal(SignalBase, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    
    hypothesis_id: Optional[UUID] = Field(default=None, foreign_key="hypothesis.id")
    hypothesis: Optional["Hypothesis"] = Relationship(back_populates="signals")

class SignalRead(SignalBase):
    id: UUID

# Hypothesis Models
class HypothesisBase(SQLModel):
    label: str
    confidence_score: float = Field(..., ge=0.0, le=1.0, description="Current confidence score of the hypothesis")

class Hypothesis(HypothesisBase, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    
    signals: List[Signal] = Relationship(back_populates="hypothesis")

class HypothesisRead(HypothesisBase):
    id: UUID
    signals: List[SignalRead] = []

class EntryCreate(SQLModel):
    content: str
class HypothesisSnapshot(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    hypothesis_id: int = Field(foreign_key="hypothesis.id")
    confidence_score: float
    timestamp: datetime = Field(default_factory=datetime.utcnow)
