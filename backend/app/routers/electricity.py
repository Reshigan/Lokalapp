from decimal import Decimal
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.database import get_db
from app.models.user import User
from app.models.wallet import Wallet, WalletStatus
from app.models.electricity import ElectricityPackage, ElectricityMeter, ElectricityConsumption, MeterStatus
from app.models.transaction import Transaction, TransactionType, TransactionStatus, PaymentMethod
from app.schemas.electricity import (
    ElectricityPackageResponse,
    ElectricityPurchaseRequest,
    ElectricityMeterResponse,
    ConsumptionResponse,
    ConsumptionRecord,
)
from app.services.auth import get_current_active_user
from app.utils.security import generate_transaction_reference

router = APIRouter(prefix="/electricity", tags=["Electricity"])


@router.get("/packages", response_model=list[ElectricityPackageResponse])
async def list_packages(db: AsyncSession = Depends(get_db)):
    """List all available electricity packages."""
    result = await db.execute(
        select(ElectricityPackage)
        .where(ElectricityPackage.is_active == 1)
        .order_by(ElectricityPackage.sort_order, ElectricityPackage.price)
    )
    packages = result.scalars().all()
    
    return [
        ElectricityPackageResponse(
            id=p.id,
            name=p.name,
            description=p.description,
            price=float(p.price),
            kwh_amount=float(p.kwh_amount)
        )
        for p in packages
    ]


@router.post("/purchase", status_code=status.HTTP_201_CREATED)
async def purchase_electricity(
    request: ElectricityPurchaseRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Purchase electricity units for a meter."""
    # Get package
    result = await db.execute(
        select(ElectricityPackage).where(ElectricityPackage.id == request.package_id)
    )
    package = result.scalar_one_or_none()
    
    if not package or package.is_active != 1:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Package not found or not available"
        )
    
    # Get meter
    result = await db.execute(
        select(ElectricityMeter)
        .where(ElectricityMeter.id == request.meter_id)
        .where(ElectricityMeter.user_id == current_user.id)
    )
    meter = result.scalar_one_or_none()
    
    if not meter:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Meter not found or not registered to you"
        )
    
    if meter.status == MeterStatus.TAMPERED:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Meter has been flagged for tampering. Please contact support."
        )
    
    # Get wallet
    result = await db.execute(
        select(Wallet).where(Wallet.user_id == current_user.id)
    )
    wallet = result.scalar_one_or_none()
    
    if not wallet or wallet.status != WalletStatus.ACTIVE:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Wallet not available"
        )
    
    # Check balance
    if wallet.balance < package.price:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Insufficient balance"
        )
    
    # Check idempotency
    if request.idempotency_key:
        result = await db.execute(
            select(Transaction).where(Transaction.idempotency_key == request.idempotency_key)
        )
        existing = result.scalar_one_or_none()
        if existing:
            return {
                "transaction_id": existing.id,
                "status": "already_processed"
            }
    
    # Debit wallet
    balance_before = wallet.balance
    wallet.balance -= package.price
    wallet.daily_spent += package.price
    wallet.monthly_spent += package.price
    
    # Create transaction
    reference = generate_transaction_reference()
    transaction = Transaction(
        wallet_id=wallet.id,
        type=TransactionType.PURCHASE,
        amount=-package.price,
        fee=Decimal("0.00"),
        balance_before=balance_before,
        balance_after=wallet.balance,
        reference=reference,
        status=TransactionStatus.COMPLETED,
        payment_method=PaymentMethod.WALLET,
        description=f"Electricity: {package.name} for meter {meter.meter_number}",
        idempotency_key=request.idempotency_key,
        extra_data={"product_type": "ELECTRICITY", "package_id": package.id, "meter_id": meter.id}
    )
    db.add(transaction)
    
    # Credit meter
    meter.kwh_balance += package.kwh_amount
    
    # Award loyalty points
    points = int(float(package.price) / 10)
    current_user.loyalty_points += points
    
    await db.commit()
    
    return {
        "transaction_id": transaction.id,
        "reference": reference,
        "meter_number": meter.meter_number,
        "kwh_purchased": float(package.kwh_amount),
        "new_kwh_balance": float(meter.kwh_balance),
        "new_wallet_balance": float(wallet.balance),
        "loyalty_points_earned": points
    }


@router.get("/meters", response_model=list[ElectricityMeterResponse])
async def list_meters(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """List user's registered electricity meters."""
    result = await db.execute(
        select(ElectricityMeter)
        .where(ElectricityMeter.user_id == current_user.id)
        .order_by(ElectricityMeter.created_at.desc())
    )
    meters = result.scalars().all()
    
    return [
        ElectricityMeterResponse(
            id=m.id,
            meter_number=m.meter_number,
            address=m.address,
            kwh_balance=float(m.kwh_balance),
            status=m.status,
            last_reading=float(m.last_reading),
            last_heartbeat=m.last_heartbeat
        )
        for m in meters
    ]


@router.get("/meters/{meter_id}", response_model=ElectricityMeterResponse)
async def get_meter(
    meter_id: str,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Get details of a specific meter."""
    result = await db.execute(
        select(ElectricityMeter)
        .where(ElectricityMeter.id == meter_id)
        .where(ElectricityMeter.user_id == current_user.id)
    )
    meter = result.scalar_one_or_none()
    
    if not meter:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Meter not found"
        )
    
    return ElectricityMeterResponse(
        id=meter.id,
        meter_number=meter.meter_number,
        address=meter.address,
        kwh_balance=float(meter.kwh_balance),
        status=meter.status,
        last_reading=float(meter.last_reading),
        last_heartbeat=meter.last_heartbeat
    )


@router.post("/meters/register", status_code=status.HTTP_201_CREATED)
async def register_meter(
    meter_number: str,
    address: str = None,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Register a new electricity meter."""
    # Check if meter already exists
    result = await db.execute(
        select(ElectricityMeter).where(ElectricityMeter.meter_number == meter_number)
    )
    existing = result.scalar_one_or_none()
    
    if existing:
        if existing.user_id == current_user.id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Meter already registered to you"
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Meter already registered to another user"
        )
    
    # Create meter
    meter = ElectricityMeter(
        meter_number=meter_number,
        user_id=current_user.id,
        address=address,
        status=MeterStatus.ON
    )
    db.add(meter)
    await db.commit()
    
    return {
        "message": "Meter registered successfully",
        "meter_id": meter.id,
        "meter_number": meter_number
    }


@router.get("/consumption/{meter_id}", response_model=ConsumptionResponse)
async def get_consumption(
    meter_id: str,
    days: int = Query(30, ge=1, le=365),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Get consumption history for a meter."""
    # Get meter
    result = await db.execute(
        select(ElectricityMeter)
        .where(ElectricityMeter.id == meter_id)
        .where(ElectricityMeter.user_id == current_user.id)
    )
    meter = result.scalar_one_or_none()
    
    if not meter:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Meter not found"
        )
    
    # Get consumption records
    since = datetime.utcnow() - timedelta(days=days)
    result = await db.execute(
        select(ElectricityConsumption)
        .where(ElectricityConsumption.meter_id == meter_id)
        .where(ElectricityConsumption.recorded_at >= since)
        .order_by(ElectricityConsumption.recorded_at.desc())
    )
    records = result.scalars().all()
    
    total_consumed = sum(float(r.kwh_consumed) for r in records)
    avg_daily = total_consumed / days if days > 0 else 0
    
    return ConsumptionResponse(
        meter_id=meter.id,
        meter_number=meter.meter_number,
        current_balance=float(meter.kwh_balance),
        total_consumed_30_days=total_consumed,
        average_daily_consumption=round(avg_daily, 2),
        records=[
            ConsumptionRecord(
                kwh_consumed=float(r.kwh_consumed),
                reading_before=float(r.reading_before),
                reading_after=float(r.reading_after),
                recorded_at=r.recorded_at
            )
            for r in records[:100]  # Limit to 100 records
        ]
    )
