import uuid
from datetime import datetime
from enum import Enum as PyEnum
from sqlalchemy import Column, String, DateTime, Enum, Integer, ForeignKey
from sqlalchemy.dialects.sqlite import JSON
from sqlalchemy.orm import relationship
from app.database import Base


class KYCStatus(str, PyEnum):
    PENDING = "PENDING"
    VERIFIED = "VERIFIED"
    REJECTED = "REJECTED"


class UserStatus(str, PyEnum):
    ACTIVE = "ACTIVE"
    SUSPENDED = "SUSPENDED"
    DEACTIVATED = "DEACTIVATED"


class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    phone_number = Column(String(15), unique=True, nullable=False, index=True)
    first_name = Column(String(100), nullable=True)
    last_name = Column(String(100), nullable=True)
    id_number = Column(String(255), nullable=True)  # Encrypted SA ID number
    email = Column(String(255), nullable=True)
    pin_hash = Column(String(255), nullable=True)
    kyc_status = Column(Enum(KYCStatus), default=KYCStatus.PENDING)
    status = Column(Enum(UserStatus), default=UserStatus.ACTIVE)
    referred_by = Column(String(36), ForeignKey("users.id"), nullable=True)
    referral_code = Column(String(10), unique=True, nullable=True)
    loyalty_points = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    wallet = relationship("Wallet", back_populates="user", uselist=False)
    agent = relationship("Agent", back_populates="user", uselist=False)
    wifi_vouchers = relationship("WiFiVoucher", back_populates="user")
    electricity_meters = relationship("ElectricityMeter", back_populates="user")
    referrer = relationship("User", remote_side=[id], backref="referrals")


class OTPCode(Base):
    __tablename__ = "otp_codes"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    phone_number = Column(String(15), nullable=False, index=True)
    code = Column(String(6), nullable=False)
    attempts = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=False)
    used = Column(Integer, default=0)  # 0 = not used, 1 = used


class RefreshToken(Base):
    __tablename__ = "refresh_tokens"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    token = Column(String(255), unique=True, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    revoked = Column(Integer, default=0)  # 0 = active, 1 = revoked
