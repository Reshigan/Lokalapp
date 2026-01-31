from pydantic import BaseModel, Field
from typing import Optional


class OTPRequest(BaseModel):
    phone_number: str = Field(..., pattern=r"^\+27[0-9]{9}$", description="SA phone number in format +27XXXXXXXXX")


class OTPVerify(BaseModel):
    phone_number: str = Field(..., pattern=r"^\+27[0-9]{9}$")
    code: str = Field(..., min_length=6, max_length=6)


class PINLogin(BaseModel):
    phone_number: str = Field(..., pattern=r"^\+27[0-9]{9}$")
    pin: str = Field(..., min_length=4, max_length=6)


class PINSet(BaseModel):
    pin: str = Field(..., min_length=4, max_length=6)
    confirm_pin: str = Field(..., min_length=4, max_length=6)


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user_id: str
    is_new_user: bool = False


class RefreshRequest(BaseModel):
    refresh_token: str
