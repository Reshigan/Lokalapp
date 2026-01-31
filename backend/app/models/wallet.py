import uuid
from datetime import datetime
from enum import Enum as PyEnum
from decimal import Decimal
from sqlalchemy import Column, String, DateTime, Enum, ForeignKey, Numeric
from sqlalchemy.orm import relationship
from app.database import Base


class WalletStatus(str, PyEnum):
    ACTIVE = "ACTIVE"
    FROZEN = "FROZEN"
    CLOSED = "CLOSED"


class Wallet(Base):
    __tablename__ = "wallets"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id"), unique=True, nullable=False)
    balance = Column(Numeric(10, 2), default=Decimal("0.00"))
    currency = Column(String(3), default="ZAR")
    status = Column(Enum(WalletStatus), default=WalletStatus.ACTIVE)
    daily_limit = Column(Numeric(10, 2), default=Decimal("5000.00"))
    monthly_limit = Column(Numeric(10, 2), default=Decimal("50000.00"))
    daily_spent = Column(Numeric(10, 2), default=Decimal("0.00"))
    monthly_spent = Column(Numeric(10, 2), default=Decimal("0.00"))
    last_daily_reset = Column(DateTime, default=datetime.utcnow)
    last_monthly_reset = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="wallet")
    transactions = relationship("Transaction", back_populates="wallet")
