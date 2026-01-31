import uuid
from datetime import datetime
from enum import Enum as PyEnum
from decimal import Decimal
from sqlalchemy import Column, String, DateTime, Enum, ForeignKey, Numeric, Integer
from sqlalchemy.orm import relationship
from app.database import Base


class VoucherStatus(str, PyEnum):
    UNUSED = "UNUSED"
    ACTIVE = "ACTIVE"
    EXPIRED = "EXPIRED"
    DEPLETED = "DEPLETED"


class WiFiPackage(Base):
    __tablename__ = "wifi_packages"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(100), nullable=False)
    description = Column(String(255), nullable=True)
    price = Column(Numeric(10, 2), nullable=False)
    data_limit_mb = Column(Integer, nullable=False)
    validity_hours = Column(Integer, nullable=False)
    is_active = Column(Integer, default=1)  # 1 = active, 0 = inactive
    sort_order = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    vouchers = relationship("WiFiVoucher", back_populates="package")


class WiFiVoucher(Base):
    __tablename__ = "wifi_vouchers"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    package_id = Column(String(36), ForeignKey("wifi_packages.id"), nullable=False)
    voucher_code = Column(String(50), unique=True, nullable=False)
    unifi_site_id = Column(String(50), nullable=True)
    status = Column(Enum(VoucherStatus), default=VoucherStatus.UNUSED)
    data_limit_mb = Column(Integer, nullable=False)
    data_used_mb = Column(Integer, default=0)
    validity_hours = Column(Integer, nullable=False)
    activated_at = Column(DateTime, nullable=True)
    expires_at = Column(DateTime, nullable=True)
    transaction_id = Column(String(36), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="wifi_vouchers")
    package = relationship("WiFiPackage", back_populates="vouchers")
    
    @property
    def data_remaining_mb(self) -> int:
        return max(0, self.data_limit_mb - self.data_used_mb)
    
    @property
    def is_valid(self) -> bool:
        if self.status != VoucherStatus.ACTIVE:
            return False
        if self.expires_at and datetime.utcnow() > self.expires_at:
            return False
        if self.data_used_mb >= self.data_limit_mb:
            return False
        return True
