from decimal import Decimal
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.database import get_db
from app.models.user import User
from app.models.wallet import Wallet, WalletStatus
from app.models.transaction import Transaction, TransactionType, TransactionStatus, PaymentMethod
from app.schemas.wallet import (
    WalletResponse,
    TopupRequest,
    TopupCallback,
    TransferRequest,
    TransactionResponse,
    TransactionListResponse,
)
from app.services.auth import get_current_active_user
from app.utils.security import generate_transaction_reference

router = APIRouter(prefix="/wallet", tags=["Wallet"])


@router.get("", response_model=WalletResponse)
async def get_wallet(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Get current user's wallet balance and details."""
    result = await db.execute(
        select(Wallet).where(Wallet.user_id == current_user.id)
    )
    wallet = result.scalar_one_or_none()
    
    if not wallet:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Wallet not found"
        )
    
    # Reset daily/monthly limits if needed
    now = datetime.utcnow()
    if wallet.last_daily_reset.date() < now.date():
        wallet.daily_spent = Decimal("0.00")
        wallet.last_daily_reset = now
    
    if wallet.last_monthly_reset.month < now.month or wallet.last_monthly_reset.year < now.year:
        wallet.monthly_spent = Decimal("0.00")
        wallet.last_monthly_reset = now
    
    await db.commit()
    
    return WalletResponse(
        id=wallet.id,
        balance=float(wallet.balance),
        currency=wallet.currency,
        status=wallet.status,
        daily_limit=float(wallet.daily_limit),
        monthly_limit=float(wallet.monthly_limit),
        daily_spent=float(wallet.daily_spent),
        monthly_spent=float(wallet.monthly_spent)
    )


@router.post("/topup", status_code=status.HTTP_201_CREATED)
async def initiate_topup(
    request: TopupRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Initiate a wallet top-up."""
    result = await db.execute(
        select(Wallet).where(Wallet.user_id == current_user.id)
    )
    wallet = result.scalar_one_or_none()
    
    if not wallet:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Wallet not found"
        )
    
    if wallet.status != WalletStatus.ACTIVE:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Wallet is not active"
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
                "reference": existing.reference,
                "status": existing.status.value,
                "message": "Transaction already exists"
            }
    
    # Create pending transaction
    reference = generate_transaction_reference()
    transaction = Transaction(
        wallet_id=wallet.id,
        type=TransactionType.TOPUP,
        amount=Decimal(str(request.amount)),
        fee=Decimal("0.00"),
        balance_before=wallet.balance,
        balance_after=wallet.balance,  # Will be updated on callback
        reference=reference,
        status=TransactionStatus.PENDING,
        payment_method=request.payment_method,
        idempotency_key=request.idempotency_key
    )
    db.add(transaction)
    await db.commit()
    
    # In production, initiate payment with gateway (Ozow, PayFast, etc.)
    # For demo, return payment URL placeholder
    payment_url = f"https://pay.lokal.vantax.co.za/topup/{transaction.id}"
    
    return {
        "transaction_id": transaction.id,
        "reference": reference,
        "amount": request.amount,
        "payment_url": payment_url,
        "status": "pending"
    }


@router.post("/topup/callback", status_code=status.HTTP_200_OK)
async def topup_callback(
    callback: TopupCallback,
    db: AsyncSession = Depends(get_db)
):
    """Handle payment gateway callback for top-up."""
    # Find transaction
    result = await db.execute(
        select(Transaction).where(Transaction.id == callback.transaction_id)
    )
    transaction = result.scalar_one_or_none()
    
    if not transaction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transaction not found"
        )
    
    if transaction.status != TransactionStatus.PENDING:
        return {"message": "Transaction already processed", "status": transaction.status.value}
    
    # Get wallet
    result = await db.execute(
        select(Wallet).where(Wallet.id == transaction.wallet_id)
    )
    wallet = result.scalar_one_or_none()
    
    if callback.status.upper() == "SUCCESS":
        # Credit wallet
        wallet.balance += transaction.amount
        transaction.balance_after = wallet.balance
        transaction.status = TransactionStatus.COMPLETED
        
        # Award loyalty points (1 point per R10 spent)
        result = await db.execute(
            select(User).where(User.id == wallet.user_id)
        )
        user = result.scalar_one_or_none()
        if user:
            points = int(float(transaction.amount) / 10)
            user.loyalty_points += points
    else:
        transaction.status = TransactionStatus.FAILED
    
    await db.commit()
    
    return {"message": "Callback processed", "status": transaction.status.value}


@router.get("/transactions", response_model=TransactionListResponse)
async def get_transactions(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    transaction_type: TransactionType = None,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Get user's transaction history."""
    result = await db.execute(
        select(Wallet).where(Wallet.user_id == current_user.id)
    )
    wallet = result.scalar_one_or_none()
    
    if not wallet:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Wallet not found"
        )
    
    # Build query
    query = select(Transaction).where(Transaction.wallet_id == wallet.id)
    count_query = select(func.count()).select_from(Transaction).where(Transaction.wallet_id == wallet.id)
    
    if transaction_type:
        query = query.where(Transaction.type == transaction_type)
        count_query = count_query.where(Transaction.type == transaction_type)
    
    # Get total count
    result = await db.execute(count_query)
    total = result.scalar()
    
    # Get paginated results
    offset = (page - 1) * page_size
    query = query.order_by(Transaction.created_at.desc()).offset(offset).limit(page_size)
    result = await db.execute(query)
    transactions = result.scalars().all()
    
    return TransactionListResponse(
        transactions=[
            TransactionResponse(
                id=t.id,
                type=t.type,
                amount=float(t.amount),
                fee=float(t.fee),
                balance_before=float(t.balance_before),
                balance_after=float(t.balance_after),
                reference=t.reference,
                status=t.status,
                payment_method=t.payment_method,
                description=t.description,
                created_at=t.created_at
            )
            for t in transactions
        ],
        total=total,
        page=page,
        page_size=page_size,
        has_more=(offset + len(transactions)) < total
    )


@router.post("/transfer", status_code=status.HTTP_201_CREATED)
async def transfer_funds(
    request: TransferRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Transfer funds to another user's wallet."""
    # Get sender wallet
    result = await db.execute(
        select(Wallet).where(Wallet.user_id == current_user.id)
    )
    sender_wallet = result.scalar_one_or_none()
    
    if not sender_wallet or sender_wallet.status != WalletStatus.ACTIVE:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Sender wallet not available"
        )
    
    # Check balance
    amount = Decimal(str(request.amount))
    if sender_wallet.balance < amount:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Insufficient balance"
        )
    
    # Check limits
    if sender_wallet.daily_spent + amount > sender_wallet.daily_limit:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Daily limit exceeded"
        )
    
    if sender_wallet.monthly_spent + amount > sender_wallet.monthly_limit:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Monthly limit exceeded"
        )
    
    # Find recipient
    result = await db.execute(
        select(User).where(User.phone_number == request.recipient_phone)
    )
    recipient = result.scalar_one_or_none()
    
    if not recipient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recipient not found"
        )
    
    if recipient.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot transfer to yourself"
        )
    
    # Get recipient wallet
    result = await db.execute(
        select(Wallet).where(Wallet.user_id == recipient.id)
    )
    recipient_wallet = result.scalar_one_or_none()
    
    if not recipient_wallet or recipient_wallet.status != WalletStatus.ACTIVE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Recipient wallet not available"
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
                "reference": existing.reference,
                "status": existing.status.value,
                "message": "Transaction already exists"
            }
    
    # Create transactions (double-entry bookkeeping)
    reference = generate_transaction_reference()
    
    # Debit sender
    sender_balance_before = sender_wallet.balance
    sender_wallet.balance -= amount
    sender_wallet.daily_spent += amount
    sender_wallet.monthly_spent += amount
    
    sender_transaction = Transaction(
        wallet_id=sender_wallet.id,
        type=TransactionType.TRANSFER,
        amount=-amount,
        fee=Decimal("0.00"),
        balance_before=sender_balance_before,
        balance_after=sender_wallet.balance,
        reference=reference,
        status=TransactionStatus.COMPLETED,
        payment_method=PaymentMethod.WALLET,
        description=f"Transfer to {request.recipient_phone}",
        idempotency_key=request.idempotency_key
    )
    db.add(sender_transaction)
    
    # Credit recipient
    recipient_balance_before = recipient_wallet.balance
    recipient_wallet.balance += amount
    
    recipient_transaction = Transaction(
        wallet_id=recipient_wallet.id,
        type=TransactionType.TRANSFER,
        amount=amount,
        fee=Decimal("0.00"),
        balance_before=recipient_balance_before,
        balance_after=recipient_wallet.balance,
        reference=reference + "-R",
        status=TransactionStatus.COMPLETED,
        payment_method=PaymentMethod.WALLET,
        description=f"Transfer from {current_user.phone_number}"
    )
    db.add(recipient_transaction)
    
    await db.commit()
    
    return {
        "transaction_id": sender_transaction.id,
        "reference": reference,
        "amount": float(amount),
        "recipient": request.recipient_phone,
        "new_balance": float(sender_wallet.balance),
        "status": "completed"
    }
