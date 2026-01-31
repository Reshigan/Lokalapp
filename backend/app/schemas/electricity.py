from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from app.models.electricity import MeterStatus


class ElectricityPackageResponse(BaseModel):
    id: str
    name: str
    description: Optional[str]
    price: float
    kwh_amount: float

    class Config:
        from_attributes = True


class ElectricityPurchaseRequest(BaseModel):
    package_id: str
    meter_id: str
    idempotency_key: Optional[str] = None


class ElectricityMeterResponse(BaseModel):
    id: str
    meter_number: str
    address: Optional[str]
    kwh_balance: float
    status: MeterStatus
    last_reading: float
    last_heartbeat: Optional[datetime]

    class Config:
        from_attributes = True


class ConsumptionRecord(BaseModel):
    kwh_consumed: float
    reading_before: float
    reading_after: float
    recorded_at: datetime


class ConsumptionResponse(BaseModel):
    meter_id: str
    meter_number: str
    current_balance: float
    total_consumed_30_days: float
    average_daily_consumption: float
    records: List[ConsumptionRecord]
