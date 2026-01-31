from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from app.models.wifi_voucher import VoucherStatus


class WiFiPackageResponse(BaseModel):
    id: str
    name: str
    description: Optional[str]
    price: float
    data_limit_mb: int
    validity_hours: int

    class Config:
        from_attributes = True


class WiFiPurchaseRequest(BaseModel):
    package_id: str
    idempotency_key: Optional[str] = None


class WiFiVoucherResponse(BaseModel):
    id: str
    package_name: str
    voucher_code: str
    status: VoucherStatus
    data_limit_mb: int
    data_used_mb: int
    data_remaining_mb: int
    validity_hours: int
    activated_at: Optional[datetime]
    expires_at: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True


class WiFiUsageResponse(BaseModel):
    total_data_purchased_mb: int
    total_data_used_mb: int
    active_vouchers: int
    vouchers: List[WiFiVoucherResponse]
