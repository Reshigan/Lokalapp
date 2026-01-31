import uuid
from datetime import datetime
from enum import Enum as PyEnum
from decimal import Decimal
from sqlalchemy import Column, String, DateTime, Enum, ForeignKey, Numeric, Integer, Text
from sqlalchemy.orm import relationship
from app.database import Base


class MeterStatus(str, PyEnum):
    ON = "ON"
    OFF = "OFF"
    TAMPERED = "TAMPERED"
    OFFLINE = "OFFLINE"


class PackageType(str, PyEnum):
    UNITS = "UNITS"  # kWh-based with consumption tracking
    UNLIMITED = "UNLIMITED"  # Unlimited usage for a set number of days


class ElectricityPackage(Base):
    __tablename__ = "electricity_packages"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(100), nullable=False)
    description = Column(String(255), nullable=True)
    price = Column(Numeric(10, 2), nullable=False)
    package_type = Column(Enum(PackageType), default=PackageType.UNITS)
    kwh_amount = Column(Numeric(10, 2), nullable=True)  # For UNITS type
    validity_days = Column(Integer, nullable=True)  # For UNLIMITED type
    is_active = Column(Integer, default=1)
    sort_order = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class SolarPole(Base):
    __tablename__ = "solar_poles"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    pole_code = Column(String(20), unique=True, nullable=False)
    location_name = Column(String(255), nullable=True)
    location_lat = Column(Numeric(10, 7), nullable=True)
    location_lng = Column(Numeric(10, 7), nullable=True)
    capacity_kw = Column(Numeric(10, 2), nullable=True)
    status = Column(String(20), default="ACTIVE")
    last_heartbeat = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    meters = relationship("ElectricityMeter", back_populates="solar_pole")


class ElectricityMeter(Base):
    __tablename__ = "electricity_meters"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    meter_number = Column(String(50), unique=True, nullable=False)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    solar_pole_id = Column(String(36), ForeignKey("solar_poles.id"), nullable=True)
    address = Column(Text, nullable=True)
    kwh_balance = Column(Numeric(10, 2), default=Decimal("0.00"))
    status = Column(Enum(MeterStatus), default=MeterStatus.ON)
    last_reading = Column(Numeric(10, 2), default=Decimal("0.00"))
    last_heartbeat = Column(DateTime, nullable=True)
    iot_device_id = Column(String(100), nullable=True)
    # For unlimited packages - tracks when unlimited access expires
    unlimited_expires_at = Column(DateTime, nullable=True)
    # For IoT consumption tracking
    current_consumption_kwh = Column(Numeric(10, 2), default=Decimal("0.00"))
    cutoff_enabled = Column(Integer, default=0)  # 1 = cutoff when balance depleted
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="electricity_meters")
    solar_pole = relationship("SolarPole", back_populates="meters")
    consumption_records = relationship("ElectricityConsumption", back_populates="meter")


class ElectricityConsumption(Base):
    __tablename__ = "electricity_consumption"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    meter_id = Column(String(36), ForeignKey("electricity_meters.id"), nullable=False)
    kwh_consumed = Column(Numeric(10, 2), nullable=False)
    reading_before = Column(Numeric(10, 2), nullable=False)
    reading_after = Column(Numeric(10, 2), nullable=False)
    recorded_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    meter = relationship("ElectricityMeter", back_populates="consumption_records")
