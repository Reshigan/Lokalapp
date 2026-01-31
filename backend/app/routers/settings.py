"""Admin settings router for payment gateways, bank accounts, and IoT devices."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import uuid

from ..database import get_db
from ..models.user import User
from .auth import get_current_user

router = APIRouter(prefix="/admin/settings", tags=["admin-settings"])


# ============== Models ==============

class PaymentGateway(BaseModel):
    id: str
    name: str
    type: str  # OZOW, PAYFAST, MANUAL
    is_active: bool
    merchant_id: Optional[str] = None
    api_key: Optional[str] = None
    environment: str  # SANDBOX, PRODUCTION


class PaymentGatewayCreate(BaseModel):
    name: str
    type: str
    is_active: bool = True
    merchant_id: Optional[str] = None
    api_key: Optional[str] = None
    environment: str = "SANDBOX"


class PaymentGatewayUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    is_active: Optional[bool] = None
    merchant_id: Optional[str] = None
    api_key: Optional[str] = None
    environment: Optional[str] = None


class BankAccount(BaseModel):
    id: str
    bank_name: str
    account_name: str
    account_number: str
    branch_code: str
    account_type: str  # SAVINGS, CURRENT, BUSINESS
    is_primary: bool


class BankAccountCreate(BaseModel):
    bank_name: str
    account_name: str
    account_number: str
    branch_code: str
    account_type: str = "CURRENT"
    is_primary: bool = False


class BankAccountUpdate(BaseModel):
    bank_name: Optional[str] = None
    account_name: Optional[str] = None
    account_number: Optional[str] = None
    branch_code: Optional[str] = None
    account_type: Optional[str] = None
    is_primary: Optional[bool] = None


class IoTDevice(BaseModel):
    id: str
    name: str
    device_type: str  # WIFI_CONTROLLER, ELECTRICITY_METER, PREPAID_METER
    serial_number: str
    ip_address: Optional[str] = None
    status: str  # ONLINE, OFFLINE, ERROR
    last_seen: Optional[str] = None
    location: Optional[str] = None


class IoTDeviceCreate(BaseModel):
    name: str
    device_type: str
    serial_number: str
    ip_address: Optional[str] = None
    location: Optional[str] = None


class IoTDeviceUpdate(BaseModel):
    name: Optional[str] = None
    device_type: Optional[str] = None
    serial_number: Optional[str] = None
    ip_address: Optional[str] = None
    location: Optional[str] = None


# ============== In-memory storage (replace with DB in production) ==============

payment_gateways_db: List[dict] = []
bank_accounts_db: List[dict] = []
iot_devices_db: List[dict] = []


def check_admin(user: User):
    """Check if user is admin."""
    if user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Admin access required")


# ============== Payment Gateway Endpoints ==============

@router.get("/payment-gateways", response_model=List[PaymentGateway])
async def get_payment_gateways(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all payment gateways."""
    check_admin(current_user)
    return payment_gateways_db


@router.post("/payment-gateways", response_model=PaymentGateway)
async def create_payment_gateway(
    data: PaymentGatewayCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new payment gateway."""
    check_admin(current_user)
    
    gateway = {
        "id": str(uuid.uuid4()),
        "name": data.name,
        "type": data.type,
        "is_active": data.is_active,
        "merchant_id": data.merchant_id,
        "api_key": data.api_key,
        "environment": data.environment,
    }
    payment_gateways_db.append(gateway)
    return gateway


@router.put("/payment-gateways/{gateway_id}", response_model=PaymentGateway)
async def update_payment_gateway(
    gateway_id: str,
    data: PaymentGatewayUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a payment gateway."""
    check_admin(current_user)
    
    for gateway in payment_gateways_db:
        if gateway["id"] == gateway_id:
            if data.name is not None:
                gateway["name"] = data.name
            if data.type is not None:
                gateway["type"] = data.type
            if data.is_active is not None:
                gateway["is_active"] = data.is_active
            if data.merchant_id is not None:
                gateway["merchant_id"] = data.merchant_id
            if data.api_key is not None:
                gateway["api_key"] = data.api_key
            if data.environment is not None:
                gateway["environment"] = data.environment
            return gateway
    
    raise HTTPException(status_code=404, detail="Payment gateway not found")


@router.delete("/payment-gateways/{gateway_id}")
async def delete_payment_gateway(
    gateway_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a payment gateway."""
    check_admin(current_user)
    
    for i, gateway in enumerate(payment_gateways_db):
        if gateway["id"] == gateway_id:
            payment_gateways_db.pop(i)
            return {"message": "Payment gateway deleted"}
    
    raise HTTPException(status_code=404, detail="Payment gateway not found")


# ============== Bank Account Endpoints ==============

@router.get("/bank-accounts", response_model=List[BankAccount])
async def get_bank_accounts(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all bank accounts."""
    check_admin(current_user)
    return bank_accounts_db


@router.post("/bank-accounts", response_model=BankAccount)
async def create_bank_account(
    data: BankAccountCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new bank account."""
    check_admin(current_user)
    
    # If this is set as primary, unset other primary accounts
    if data.is_primary:
        for account in bank_accounts_db:
            account["is_primary"] = False
    
    account = {
        "id": str(uuid.uuid4()),
        "bank_name": data.bank_name,
        "account_name": data.account_name,
        "account_number": data.account_number,
        "branch_code": data.branch_code,
        "account_type": data.account_type,
        "is_primary": data.is_primary,
    }
    bank_accounts_db.append(account)
    return account


@router.put("/bank-accounts/{account_id}", response_model=BankAccount)
async def update_bank_account(
    account_id: str,
    data: BankAccountUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a bank account."""
    check_admin(current_user)
    
    for account in bank_accounts_db:
        if account["id"] == account_id:
            if data.bank_name is not None:
                account["bank_name"] = data.bank_name
            if data.account_name is not None:
                account["account_name"] = data.account_name
            if data.account_number is not None:
                account["account_number"] = data.account_number
            if data.branch_code is not None:
                account["branch_code"] = data.branch_code
            if data.account_type is not None:
                account["account_type"] = data.account_type
            if data.is_primary is not None:
                # If setting as primary, unset others
                if data.is_primary:
                    for other in bank_accounts_db:
                        other["is_primary"] = False
                account["is_primary"] = data.is_primary
            return account
    
    raise HTTPException(status_code=404, detail="Bank account not found")


@router.delete("/bank-accounts/{account_id}")
async def delete_bank_account(
    account_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a bank account."""
    check_admin(current_user)
    
    for i, account in enumerate(bank_accounts_db):
        if account["id"] == account_id:
            bank_accounts_db.pop(i)
            return {"message": "Bank account deleted"}
    
    raise HTTPException(status_code=404, detail="Bank account not found")


# ============== IoT Device Endpoints ==============

@router.get("/iot-devices", response_model=List[IoTDevice])
async def get_iot_devices(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all IoT devices."""
    check_admin(current_user)
    return iot_devices_db


@router.post("/iot-devices", response_model=IoTDevice)
async def create_iot_device(
    data: IoTDeviceCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new IoT device."""
    check_admin(current_user)
    
    device = {
        "id": str(uuid.uuid4()),
        "name": data.name,
        "device_type": data.device_type,
        "serial_number": data.serial_number,
        "ip_address": data.ip_address,
        "status": "OFFLINE",
        "last_seen": None,
        "location": data.location,
    }
    iot_devices_db.append(device)
    return device


@router.put("/iot-devices/{device_id}", response_model=IoTDevice)
async def update_iot_device(
    device_id: str,
    data: IoTDeviceUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update an IoT device."""
    check_admin(current_user)
    
    for device in iot_devices_db:
        if device["id"] == device_id:
            if data.name is not None:
                device["name"] = data.name
            if data.device_type is not None:
                device["device_type"] = data.device_type
            if data.serial_number is not None:
                device["serial_number"] = data.serial_number
            if data.ip_address is not None:
                device["ip_address"] = data.ip_address
            if data.location is not None:
                device["location"] = data.location
            return device
    
    raise HTTPException(status_code=404, detail="IoT device not found")


@router.delete("/iot-devices/{device_id}")
async def delete_iot_device(
    device_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete an IoT device."""
    check_admin(current_user)
    
    for i, device in enumerate(iot_devices_db):
        if device["id"] == device_id:
            iot_devices_db.pop(i)
            return {"message": "IoT device deleted"}
    
    raise HTTPException(status_code=404, detail="IoT device not found")


# ============== Device Status Update (for IoT devices to report status) ==============

@router.post("/iot-devices/{device_id}/heartbeat")
async def device_heartbeat(
    device_id: str,
    db: Session = Depends(get_db)
):
    """Update device status (called by IoT devices)."""
    for device in iot_devices_db:
        if device["id"] == device_id:
            device["status"] = "ONLINE"
            device["last_seen"] = datetime.utcnow().isoformat()
            return {"message": "Heartbeat received"}
    
    raise HTTPException(status_code=404, detail="IoT device not found")
