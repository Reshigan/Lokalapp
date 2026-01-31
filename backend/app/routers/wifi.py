from decimal import Decimal
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.database import get_db
from app.models.user import User
from app.models.wallet import Wallet, WalletStatus
from app.models.wifi_voucher import WiFiPackage, WiFiVoucher, VoucherStatus
from app.models.transaction import Transaction, TransactionType, TransactionStatus, PaymentMethod
from app.schemas.wifi import (
    WiFiPackageResponse,
    WiFiPurchaseRequest,
    WiFiVoucherResponse,
    WiFiUsageResponse,
)
from app.services.auth import get_current_active_user
from app.utils.security import generate_transaction_reference, generate_voucher_code

router = APIRouter(prefix="/wifi", tags=["WiFi"])


@router.get("/packages", response_model=list[WiFiPackageResponse])
async def list_packages(db: AsyncSession = Depends(get_db)):
    """List all available WiFi packages."""
    result = await db.execute(
        select(WiFiPackage)
        .where(WiFiPackage.is_active == 1)
        .order_by(WiFiPackage.sort_order, WiFiPackage.price)
    )
    packages = result.scalars().all()
    
    return [
        WiFiPackageResponse(
            id=p.id,
            name=p.name,
            description=p.description,
            price=float(p.price),
            data_limit_mb=p.data_limit_mb,
            validity_hours=p.validity_hours
        )
        for p in packages
    ]


@router.post("/purchase", status_code=status.HTTP_201_CREATED)
async def purchase_wifi(
    request: WiFiPurchaseRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Purchase a WiFi voucher."""
    # Get package
    result = await db.execute(
        select(WiFiPackage).where(WiFiPackage.id == request.package_id)
    )
    package = result.scalar_one_or_none()
    
    if not package or package.is_active != 1:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Package not found or not available"
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
            # Find the voucher
            result = await db.execute(
                select(WiFiVoucher).where(WiFiVoucher.transaction_id == existing.id)
            )
            voucher = result.scalar_one_or_none()
            return {
                "transaction_id": existing.id,
                "voucher_id": voucher.id if voucher else None,
                "voucher_code": voucher.voucher_code if voucher else None,
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
        description=f"WiFi: {package.name}",
        idempotency_key=request.idempotency_key,
        extra_data={"product_type": "WIFI", "package_id": package.id}
    )
    db.add(transaction)
    await db.flush()
    
    # Generate voucher code (in production, integrate with UniFi)
    voucher_code = generate_voucher_code()
    
    # Create voucher
    voucher = WiFiVoucher(
        user_id=current_user.id,
        package_id=package.id,
        voucher_code=voucher_code,
        status=VoucherStatus.UNUSED,
        data_limit_mb=package.data_limit_mb,
        validity_hours=package.validity_hours,
        transaction_id=transaction.id
    )
    db.add(voucher)
    
    # Award loyalty points
    points = int(float(package.price) / 10)
    current_user.loyalty_points += points
    
    await db.commit()
    
    return {
        "transaction_id": transaction.id,
        "voucher_id": voucher.id,
        "voucher_code": voucher_code,
        "package_name": package.name,
        "data_limit_mb": package.data_limit_mb,
        "validity_hours": package.validity_hours,
        "new_balance": float(wallet.balance),
        "loyalty_points_earned": points
    }


@router.get("/vouchers", response_model=list[WiFiVoucherResponse])
async def list_vouchers(
    status_filter: VoucherStatus = None,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """List user's WiFi vouchers."""
    query = (
        select(WiFiVoucher, WiFiPackage)
        .join(WiFiPackage, WiFiVoucher.package_id == WiFiPackage.id)
        .where(WiFiVoucher.user_id == current_user.id)
    )
    
    if status_filter:
        query = query.where(WiFiVoucher.status == status_filter)
    
    query = query.order_by(WiFiVoucher.created_at.desc())
    result = await db.execute(query)
    rows = result.all()
    
    return [
        WiFiVoucherResponse(
            id=voucher.id,
            package_name=package.name,
            voucher_code=voucher.voucher_code,
            status=voucher.status,
            data_limit_mb=voucher.data_limit_mb,
            data_used_mb=voucher.data_used_mb,
            data_remaining_mb=max(0, voucher.data_limit_mb - voucher.data_used_mb),
            validity_hours=voucher.validity_hours,
            activated_at=voucher.activated_at,
            expires_at=voucher.expires_at,
            created_at=voucher.created_at
        )
        for voucher, package in rows
    ]


@router.get("/vouchers/{voucher_id}", response_model=WiFiVoucherResponse)
async def get_voucher(
    voucher_id: str,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Get details of a specific voucher."""
    result = await db.execute(
        select(WiFiVoucher, WiFiPackage)
        .join(WiFiPackage, WiFiVoucher.package_id == WiFiPackage.id)
        .where(WiFiVoucher.id == voucher_id)
        .where(WiFiVoucher.user_id == current_user.id)
    )
    row = result.one_or_none()
    
    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Voucher not found"
        )
    
    voucher, package = row
    
    return WiFiVoucherResponse(
        id=voucher.id,
        package_name=package.name,
        voucher_code=voucher.voucher_code,
        status=voucher.status,
        data_limit_mb=voucher.data_limit_mb,
        data_used_mb=voucher.data_used_mb,
        data_remaining_mb=max(0, voucher.data_limit_mb - voucher.data_used_mb),
        validity_hours=voucher.validity_hours,
        activated_at=voucher.activated_at,
        expires_at=voucher.expires_at,
        created_at=voucher.created_at
    )


@router.post("/vouchers/{voucher_id}/activate", status_code=status.HTTP_200_OK)
async def activate_voucher(
    voucher_id: str,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Activate a WiFi voucher."""
    result = await db.execute(
        select(WiFiVoucher)
        .where(WiFiVoucher.id == voucher_id)
        .where(WiFiVoucher.user_id == current_user.id)
    )
    voucher = result.scalar_one_or_none()
    
    if not voucher:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Voucher not found"
        )
    
    if voucher.status != VoucherStatus.UNUSED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Voucher cannot be activated. Current status: {voucher.status.value}"
        )
    
    # Activate voucher
    now = datetime.utcnow()
    voucher.status = VoucherStatus.ACTIVE
    voucher.activated_at = now
    voucher.expires_at = now + timedelta(hours=voucher.validity_hours)
    
    await db.commit()
    
    return {
        "message": "Voucher activated successfully",
        "voucher_code": voucher.voucher_code,
        "expires_at": voucher.expires_at.isoformat(),
        "data_limit_mb": voucher.data_limit_mb
    }


@router.get("/usage", response_model=WiFiUsageResponse)
async def get_usage(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Get WiFi usage summary."""
    # Get all vouchers
    result = await db.execute(
        select(WiFiVoucher, WiFiPackage)
        .join(WiFiPackage, WiFiVoucher.package_id == WiFiPackage.id)
        .where(WiFiVoucher.user_id == current_user.id)
        .order_by(WiFiVoucher.created_at.desc())
    )
    rows = result.all()
    
    total_purchased = 0
    total_used = 0
    active_count = 0
    vouchers = []
    
    for voucher, package in rows:
        total_purchased += voucher.data_limit_mb
        total_used += voucher.data_used_mb
        
        if voucher.status == VoucherStatus.ACTIVE:
            # Check if expired
            if voucher.expires_at and datetime.utcnow() > voucher.expires_at:
                voucher.status = VoucherStatus.EXPIRED
            elif voucher.data_used_mb >= voucher.data_limit_mb:
                voucher.status = VoucherStatus.DEPLETED
            else:
                active_count += 1
        
        vouchers.append(WiFiVoucherResponse(
            id=voucher.id,
            package_name=package.name,
            voucher_code=voucher.voucher_code,
            status=voucher.status,
            data_limit_mb=voucher.data_limit_mb,
            data_used_mb=voucher.data_used_mb,
            data_remaining_mb=max(0, voucher.data_limit_mb - voucher.data_used_mb),
            validity_hours=voucher.validity_hours,
            activated_at=voucher.activated_at,
            expires_at=voucher.expires_at,
            created_at=voucher.created_at
        ))
    
    await db.commit()
    
    return WiFiUsageResponse(
        total_data_purchased_mb=total_purchased,
        total_data_used_mb=total_used,
        active_vouchers=active_count,
        vouchers=vouchers[:10]  # Return last 10 vouchers
    )
