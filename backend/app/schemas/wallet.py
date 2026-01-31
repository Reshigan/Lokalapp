from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from decimal import Decimal
from app.models.wallet import WalletStatus
from app.models.transaction import TransactionType, TransactionStatus, PaymentMethod


class WalletResponse(BaseModel):
    id: str
    balance: float
    currency: str
    status: WalletStatus
    daily_limit: float
    monthly_limit: float
    daily_spent: float
    monthly_spent: float

    class Config:
        from_attributes = True


class TopupRequest(BaseModel):
    amount: float = Field(..., gt=0, le=50000)
    payment_method: PaymentMethod
    idempotency_key: Optional[str] = None


class TopupCallback(BaseModel):
    transaction_id: str
    status: str
    amount: float
    reference: str
    payment_method: str
    signature: Optional[str] = None


class TransferRequest(BaseModel):
    recipient_phone: str = Field(..., pattern=r"^\+27[0-9]{9}$")
    amount: float = Field(..., gt=0)
    description: Optional[str] = None
    idempotency_key: Optional[str] = None


class TransactionResponse(BaseModel):
    id: str
    type: TransactionType
    amount: float
    fee: float
    balance_before: float
    balance_after: float
    reference: str
    status: TransactionStatus
    payment_method: Optional[PaymentMethod]
    description: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class TransactionListResponse(BaseModel):
    transactions: List[TransactionResponse]
    total: int
    page: int
    page_size: int
    has_more: bool
