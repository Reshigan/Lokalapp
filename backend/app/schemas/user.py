from pydantic import BaseModel, Field, EmailStr
from typing import Optional
from datetime import datetime
from app.models.user import KYCStatus, UserStatus


class UserCreate(BaseModel):
    phone_number: str = Field(..., pattern=r"^\+27[0-9]{9}$")
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[EmailStr] = None
    referral_code: Optional[str] = None


class UserUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[EmailStr] = None


class UserResponse(BaseModel):
    id: str
    phone_number: str
    first_name: Optional[str]
    last_name: Optional[str]
    email: Optional[str]
    kyc_status: KYCStatus
    status: UserStatus
    referral_code: Optional[str]
    loyalty_points: int
    has_pin: bool
    created_at: datetime

    class Config:
        from_attributes = True


class KYCSubmit(BaseModel):
    id_number: str = Field(..., min_length=13, max_length=13, description="SA ID number")
    first_name: str
    last_name: str
    selfie_base64: Optional[str] = None
    id_document_base64: Optional[str] = None
    proof_of_address_base64: Optional[str] = None


class LoyaltyResponse(BaseModel):
    points: int
    tier: str
    next_tier_points: int
    rewards_available: int
