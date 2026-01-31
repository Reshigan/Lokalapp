import uuid
from datetime import datetime
from enum import Enum as PyEnum
from decimal import Decimal
from sqlalchemy import Column, String, DateTime, Enum, ForeignKey, Numeric, Text
from sqlalchemy.dialects.sqlite import JSON
from sqlalchemy.orm import relationship
from app.database import Base


class TransactionType(str, PyEnum):
    TOPUP = "TOPUP"
    PURCHASE = "PURCHASE"
    TRANSFER = "TRANSFER"
    REFUND = "REFUND"
    COMMISSION = "COMMISSION"
    WITHDRAWAL = "WITHDRAWAL"


class TransactionStatus(str, PyEnum):
    PENDING = "PENDING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    REVERSED = "REVERSED"


class PaymentMethod(str, PyEnum):
    CARD = "CARD"
    EFT = "EFT"
    AGENT = "AGENT"
    VOUCHER = "VOUCHER"
    WALLET = "WALLET"
    SNAPSCAN = "SNAPSCAN"
    ZAPPER = "ZAPPER"


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    wallet_id = Column(String(36), ForeignKey("wallets.id"), nullable=False)
    type = Column(Enum(TransactionType), nullable=False)
    amount = Column(Numeric(10, 2), nullable=False)
    fee = Column(Numeric(10, 2), default=Decimal("0.00"))
    balance_before = Column(Numeric(10, 2), nullable=False)
    balance_after = Column(Numeric(10, 2), nullable=False)
    reference = Column(String(50), unique=True, nullable=False)
    status = Column(Enum(TransactionStatus), default=TransactionStatus.PENDING)
    payment_method = Column(Enum(PaymentMethod), nullable=True)
    agent_id = Column(String(36), ForeignKey("agents.id"), nullable=True)
    description = Column(Text, nullable=True)
    extra_data = Column(JSON, nullable=True)
    idempotency_key = Column(String(100), unique=True, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    wallet = relationship("Wallet", back_populates="transactions")
    agent = relationship("Agent", back_populates="transactions")
