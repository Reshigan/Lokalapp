import uuid
from datetime import datetime
from enum import Enum as PyEnum
from decimal import Decimal
from sqlalchemy import Column, String, DateTime, Enum, ForeignKey, Numeric, Text
from sqlalchemy.orm import relationship
from app.database import Base


class AgentTier(str, PyEnum):
    BRONZE = "BRONZE"
    SILVER = "SILVER"
    GOLD = "GOLD"
    PLATINUM = "PLATINUM"


class BusinessType(str, PyEnum):
    SPAZA = "SPAZA"
    TRADER = "TRADER"
    COMMUNITY = "COMMUNITY"
    OTHER = "OTHER"


class AgentStatus(str, PyEnum):
    PENDING = "PENDING"
    ACTIVE = "ACTIVE"
    SUSPENDED = "SUSPENDED"


# Commission rates by tier
COMMISSION_RATES = {
    AgentTier.BRONZE: Decimal("0.05"),    # 5%
    AgentTier.SILVER: Decimal("0.07"),    # 7%
    AgentTier.GOLD: Decimal("0.10"),      # 10%
    AgentTier.PLATINUM: Decimal("0.12"),  # 12%
}


class Agent(Base):
    __tablename__ = "agents"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id"), unique=True, nullable=False)
    agent_code = Column(String(10), unique=True, nullable=False)
    business_name = Column(String(255), nullable=False)
    business_type = Column(Enum(BusinessType), default=BusinessType.OTHER)
    tier = Column(Enum(AgentTier), default=AgentTier.BRONZE)
    float_balance = Column(Numeric(10, 2), default=Decimal("0.00"))
    commission_balance = Column(Numeric(10, 2), default=Decimal("0.00"))
    total_sales = Column(Numeric(12, 2), default=Decimal("0.00"))
    monthly_sales = Column(Numeric(12, 2), default=Decimal("0.00"))
    location_lat = Column(Numeric(10, 7), nullable=True)
    location_lng = Column(Numeric(10, 7), nullable=True)
    address = Column(Text, nullable=True)
    territory_id = Column(String(36), nullable=True)
    status = Column(Enum(AgentStatus), default=AgentStatus.PENDING)
    low_float_threshold = Column(Numeric(10, 2), default=Decimal("100.00"))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="agent")
    transactions = relationship("Transaction", back_populates="agent")
    
    @property
    def commission_rate(self) -> Decimal:
        return COMMISSION_RATES.get(self.tier, Decimal("0.05"))
