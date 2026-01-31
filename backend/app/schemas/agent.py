from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from app.models.agent import AgentTier, BusinessType, AgentStatus


class AgentRegister(BaseModel):
    business_name: str = Field(..., min_length=2, max_length=255)
    business_type: BusinessType
    address: Optional[str] = None
    location_lat: Optional[float] = None
    location_lng: Optional[float] = None
    initial_float: float = Field(..., ge=500, description="Minimum R500 initial float")


class AgentResponse(BaseModel):
    id: str
    agent_code: str
    business_name: str
    business_type: BusinessType
    tier: AgentTier
    float_balance: float
    commission_balance: float
    total_sales: float
    monthly_sales: float
    status: AgentStatus
    address: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class AgentFloatTopup(BaseModel):
    amount: float = Field(..., gt=0)
    payment_method: str


class AgentTransaction(BaseModel):
    customer_phone: str = Field(..., pattern=r"^\+27[0-9]{9}$")
    product_type: str = Field(..., description="WIFI or ELECTRICITY")
    package_id: str
    meter_id: Optional[str] = None
    cash_received: float = Field(..., gt=0)
    idempotency_key: Optional[str] = None


class CommissionResponse(BaseModel):
    balance: float
    pending: float
    total_earned: float
    last_withdrawal: Optional[datetime]
    transactions: List[dict]


class CommissionWithdraw(BaseModel):
    amount: float = Field(..., gt=0)
    withdrawal_method: str = Field(..., description="WALLET or BANK")
    bank_account: Optional[str] = None


class CustomerSearch(BaseModel):
    phone_number: Optional[str] = None
    name: Optional[str] = None


class CustomerRegister(BaseModel):
    phone_number: str = Field(..., pattern=r"^\+27[0-9]{9}$")
    first_name: str
    last_name: Optional[str] = None
