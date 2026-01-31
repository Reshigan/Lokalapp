from decimal import Decimal
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from app.database import get_db
from app.models.user import User, KYCStatus
from app.models.wallet import Wallet, WalletStatus
from app.models.agent import Agent, AgentTier, AgentStatus, BusinessType, COMMISSION_RATES
from app.models.wifi_voucher import WiFiPackage, WiFiVoucher, VoucherStatus
from app.models.electricity import ElectricityPackage, ElectricityMeter
from app.models.transaction import Transaction, TransactionType, TransactionStatus, PaymentMethod
from app.schemas.agent import (
    AgentRegister,
    AgentResponse,
    AgentFloatTopup,
    AgentTransaction,
    CommissionResponse,
    CommissionWithdraw,
    CustomerSearch,
    CustomerRegister,
)
from app.services.auth import get_current_active_user
from app.utils.security import (
    generate_transaction_reference,
    generate_agent_code,
    generate_voucher_code,
    generate_referral_code,
)
from app.config import settings

router = APIRouter(prefix="/agent", tags=["Agent"])


async def get_current_agent(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
) -> Agent:
    """Get the current user's agent profile."""
    result = await db.execute(
        select(Agent).where(Agent.user_id == current_user.id)
    )
    agent = result.scalar_one_or_none()
    
    if not agent:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not registered as an agent"
        )
    
    if agent.status != AgentStatus.ACTIVE:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Agent account is {agent.status.value}"
        )
    
    return agent


@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register_agent(
    request: AgentRegister,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Register as an agent."""
    # Check if already an agent
    result = await db.execute(
        select(Agent).where(Agent.user_id == current_user.id)
    )
    existing = result.scalar_one_or_none()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You are already registered as an agent"
        )
    
    # Check KYC status
    if current_user.kyc_status != KYCStatus.VERIFIED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="KYC verification required before agent registration"
        )
    
    # Check minimum float
    if request.initial_float < settings.MIN_FLOAT_DEPOSIT:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Minimum initial float is R{settings.MIN_FLOAT_DEPOSIT}"
        )
    
    # Create agent
    agent_code = generate_agent_code()
    agent = Agent(
        user_id=current_user.id,
        agent_code=agent_code,
        business_name=request.business_name,
        business_type=request.business_type,
        address=request.address,
        location_lat=Decimal(str(request.location_lat)) if request.location_lat else None,
        location_lng=Decimal(str(request.location_lng)) if request.location_lng else None,
        float_balance=Decimal(str(request.initial_float)),
        status=AgentStatus.ACTIVE  # Auto-approve for demo
    )
    db.add(agent)
    await db.commit()
    
    return {
        "message": "Agent registration successful",
        "agent_code": agent_code,
        "status": agent.status.value,
        "float_balance": float(agent.float_balance)
    }


@router.get("/profile", response_model=AgentResponse)
async def get_agent_profile(
    agent: Agent = Depends(get_current_agent),
    db: AsyncSession = Depends(get_db)
):
    """Get agent profile."""
    return AgentResponse(
        id=agent.id,
        agent_code=agent.agent_code,
        business_name=agent.business_name,
        business_type=agent.business_type,
        tier=agent.tier,
        float_balance=float(agent.float_balance),
        commission_balance=float(agent.commission_balance),
        total_sales=float(agent.total_sales),
        monthly_sales=float(agent.monthly_sales),
        status=agent.status,
        address=agent.address,
        created_at=agent.created_at
    )


@router.get("/float")
async def get_float_balance(
    agent: Agent = Depends(get_current_agent)
):
    """Get agent's float balance."""
    return {
        "float_balance": float(agent.float_balance),
        "low_float_threshold": float(agent.low_float_threshold),
        "is_low": agent.float_balance < agent.low_float_threshold
    }


@router.post("/float/topup", status_code=status.HTTP_201_CREATED)
async def topup_float(
    request: AgentFloatTopup,
    agent: Agent = Depends(get_current_agent),
    db: AsyncSession = Depends(get_db)
):
    """Top up agent float."""
    # In production, integrate with payment gateway
    # For demo, auto-approve
    agent.float_balance += Decimal(str(request.amount))
    await db.commit()
    
    return {
        "message": "Float topped up successfully",
        "amount": request.amount,
        "new_balance": float(agent.float_balance)
    }


@router.post("/transaction", status_code=status.HTTP_201_CREATED)
async def process_transaction(
    request: AgentTransaction,
    current_user: User = Depends(get_current_active_user),
    agent: Agent = Depends(get_current_agent),
    db: AsyncSession = Depends(get_db)
):
    """Process a customer transaction (WiFi or Electricity purchase)."""
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
    
    # Find or create customer
    result = await db.execute(
        select(User).where(User.phone_number == request.customer_phone)
    )
    customer = result.scalar_one_or_none()
    
    if not customer:
        # Create new customer
        customer = User(
            phone_number=request.customer_phone,
            referral_code=generate_referral_code(),
            referred_by=current_user.id
        )
        db.add(customer)
        await db.flush()
        
        # Create wallet for customer
        customer_wallet = Wallet(user_id=customer.id)
        db.add(customer_wallet)
        await db.flush()
        
        # Award referral bonus to agent
        agent.commission_balance += Decimal(str(settings.REFERRAL_BONUS_AMOUNT))
    else:
        result = await db.execute(
            select(Wallet).where(Wallet.user_id == customer.id)
        )
        customer_wallet = result.scalar_one_or_none()
        if not customer_wallet:
            customer_wallet = Wallet(user_id=customer.id)
            db.add(customer_wallet)
            await db.flush()
    
    # Process based on product type
    if request.product_type.upper() == "WIFI":
        # Get WiFi package
        result = await db.execute(
            select(WiFiPackage).where(WiFiPackage.id == request.package_id)
        )
        package = result.scalar_one_or_none()
        
        if not package or package.is_active != 1:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="WiFi package not found"
            )
        
        price = package.price
        
        # Check agent float
        if agent.float_balance < price:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Insufficient float balance"
            )
        
        # Check cash received
        if Decimal(str(request.cash_received)) < price:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Insufficient cash received"
            )
        
        # Debit agent float
        agent.float_balance -= price
        agent.total_sales += price
        agent.monthly_sales += price
        
        # Calculate commission
        commission = price * COMMISSION_RATES[agent.tier]
        agent.commission_balance += commission
        
        # Generate voucher
        voucher_code = generate_voucher_code()
        voucher = WiFiVoucher(
            user_id=customer.id,
            package_id=package.id,
            voucher_code=voucher_code,
            status=VoucherStatus.UNUSED,
            data_limit_mb=package.data_limit_mb,
            validity_hours=package.validity_hours
        )
        db.add(voucher)
        
        # Create transaction record
        reference = generate_transaction_reference()
        transaction = Transaction(
            wallet_id=customer_wallet.id,
            type=TransactionType.PURCHASE,
            amount=price,
            fee=Decimal("0.00"),
            balance_before=customer_wallet.balance,
            balance_after=customer_wallet.balance,
            reference=reference,
            status=TransactionStatus.COMPLETED,
            payment_method=PaymentMethod.AGENT,
            agent_id=agent.id,
            description=f"WiFi: {package.name} via Agent {agent.agent_code}",
            idempotency_key=request.idempotency_key,
            extra_data={"product_type": "WIFI", "voucher_code": voucher_code}
        )
        db.add(transaction)
        
        await db.commit()
        
        return {
            "transaction_id": transaction.id,
            "reference": reference,
            "product_type": "WIFI",
            "package_name": package.name,
            "voucher_code": voucher_code,
            "amount": float(price),
            "commission_earned": float(commission),
            "new_float_balance": float(agent.float_balance),
            "customer_phone": request.customer_phone
        }
    
    elif request.product_type.upper() == "ELECTRICITY":
        if not request.meter_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Meter ID required for electricity purchase"
            )
        
        # Get electricity package
        result = await db.execute(
            select(ElectricityPackage).where(ElectricityPackage.id == request.package_id)
        )
        package = result.scalar_one_or_none()
        
        if not package or package.is_active != 1:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Electricity package not found"
            )
        
        # Get meter
        result = await db.execute(
            select(ElectricityMeter).where(ElectricityMeter.id == request.meter_id)
        )
        meter = result.scalar_one_or_none()
        
        if not meter:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Meter not found"
            )
        
        price = package.price
        
        # Check agent float
        if agent.float_balance < price:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Insufficient float balance"
            )
        
        # Check cash received
        if Decimal(str(request.cash_received)) < price:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Insufficient cash received"
            )
        
        # Debit agent float
        agent.float_balance -= price
        agent.total_sales += price
        agent.monthly_sales += price
        
        # Calculate commission
        commission = price * COMMISSION_RATES[agent.tier]
        agent.commission_balance += commission
        
        # Credit meter
        meter.kwh_balance += package.kwh_amount
        
        # Create transaction record
        reference = generate_transaction_reference()
        transaction = Transaction(
            wallet_id=customer_wallet.id,
            type=TransactionType.PURCHASE,
            amount=price,
            fee=Decimal("0.00"),
            balance_before=customer_wallet.balance,
            balance_after=customer_wallet.balance,
            reference=reference,
            status=TransactionStatus.COMPLETED,
            payment_method=PaymentMethod.AGENT,
            agent_id=agent.id,
            description=f"Electricity: {package.name} for meter {meter.meter_number}",
            idempotency_key=request.idempotency_key,
            extra_data={"product_type": "ELECTRICITY", "meter_number": meter.meter_number}
        )
        db.add(transaction)
        
        await db.commit()
        
        return {
            "transaction_id": transaction.id,
            "reference": reference,
            "product_type": "ELECTRICITY",
            "package_name": package.name,
            "kwh_purchased": float(package.kwh_amount),
            "meter_number": meter.meter_number,
            "new_meter_balance": float(meter.kwh_balance),
            "amount": float(price),
            "commission_earned": float(commission),
            "new_float_balance": float(agent.float_balance),
            "customer_phone": request.customer_phone
        }
    
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid product type. Must be WIFI or ELECTRICITY"
        )


@router.get("/commissions", response_model=CommissionResponse)
async def get_commissions(
    agent: Agent = Depends(get_current_agent),
    db: AsyncSession = Depends(get_db)
):
    """Get agent's commission balance and history."""
    # Get commission transactions
    result = await db.execute(
        select(Transaction)
        .where(Transaction.agent_id == agent.id)
        .where(Transaction.status == TransactionStatus.COMPLETED)
        .order_by(Transaction.created_at.desc())
        .limit(50)
    )
    transactions = result.scalars().all()
    
    total_earned = sum(
        float(t.amount) * float(COMMISSION_RATES[agent.tier])
        for t in transactions
        if t.type == TransactionType.PURCHASE
    )
    
    return CommissionResponse(
        balance=float(agent.commission_balance),
        pending=0.0,  # No pending commissions in this implementation
        total_earned=total_earned,
        last_withdrawal=None,  # Would track this in production
        transactions=[
            {
                "id": t.id,
                "amount": float(t.amount),
                "commission": float(t.amount) * float(COMMISSION_RATES[agent.tier]),
                "description": t.description,
                "created_at": t.created_at.isoformat()
            }
            for t in transactions[:20]
        ]
    )


@router.post("/commissions/withdraw", status_code=status.HTTP_201_CREATED)
async def withdraw_commission(
    request: CommissionWithdraw,
    current_user: User = Depends(get_current_active_user),
    agent: Agent = Depends(get_current_agent),
    db: AsyncSession = Depends(get_db)
):
    """Withdraw commission balance."""
    amount = Decimal(str(request.amount))
    
    if amount > agent.commission_balance:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Insufficient commission balance"
        )
    
    if request.withdrawal_method == "WALLET":
        # Transfer to user wallet
        result = await db.execute(
            select(Wallet).where(Wallet.user_id == current_user.id)
        )
        wallet = result.scalar_one_or_none()
        
        if not wallet:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Wallet not found"
            )
        
        # Debit commission, credit wallet
        agent.commission_balance -= amount
        wallet.balance += amount
        
        # Create transaction
        reference = generate_transaction_reference()
        transaction = Transaction(
            wallet_id=wallet.id,
            type=TransactionType.COMMISSION,
            amount=amount,
            fee=Decimal("0.00"),
            balance_before=wallet.balance - amount,
            balance_after=wallet.balance,
            reference=reference,
            status=TransactionStatus.COMPLETED,
            payment_method=PaymentMethod.WALLET,
            description="Commission withdrawal to wallet"
        )
        db.add(transaction)
        
        await db.commit()
        
        return {
            "message": "Commission withdrawn to wallet",
            "amount": float(amount),
            "new_commission_balance": float(agent.commission_balance),
            "new_wallet_balance": float(wallet.balance)
        }
    
    else:
        # Bank transfer - would integrate with payment provider
        agent.commission_balance -= amount
        await db.commit()
        
        return {
            "message": "Commission withdrawal initiated to bank account",
            "amount": float(amount),
            "new_commission_balance": float(agent.commission_balance),
            "estimated_arrival": "1-2 business days"
        }


@router.get("/customers")
async def search_customers(
    phone: str = None,
    name: str = None,
    agent: Agent = Depends(get_current_agent),
    db: AsyncSession = Depends(get_db)
):
    """Search for customers."""
    query = select(User)
    
    if phone:
        query = query.where(User.phone_number.contains(phone))
    
    if name:
        query = query.where(
            or_(
                User.first_name.ilike(f"%{name}%"),
                User.last_name.ilike(f"%{name}%")
            )
        )
    
    query = query.limit(20)
    result = await db.execute(query)
    users = result.scalars().all()
    
    return [
        {
            "id": u.id,
            "phone_number": u.phone_number,
            "first_name": u.first_name,
            "last_name": u.last_name,
            "kyc_status": u.kyc_status.value
        }
        for u in users
    ]


@router.post("/customers", status_code=status.HTTP_201_CREATED)
async def register_customer(
    request: CustomerRegister,
    current_user: User = Depends(get_current_active_user),
    agent: Agent = Depends(get_current_agent),
    db: AsyncSession = Depends(get_db)
):
    """Register a new customer."""
    # Check if customer exists
    result = await db.execute(
        select(User).where(User.phone_number == request.phone_number)
    )
    existing = result.scalar_one_or_none()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Customer already registered"
        )
    
    # Create customer
    customer = User(
        phone_number=request.phone_number,
        first_name=request.first_name,
        last_name=request.last_name,
        referral_code=generate_referral_code(),
        referred_by=current_user.id
    )
    db.add(customer)
    await db.flush()
    
    # Create wallet
    wallet = Wallet(user_id=customer.id)
    db.add(wallet)
    
    # Award referral bonus
    agent.commission_balance += Decimal(str(settings.REFERRAL_BONUS_AMOUNT))
    
    await db.commit()
    
    return {
        "message": "Customer registered successfully",
        "customer_id": customer.id,
        "phone_number": customer.phone_number,
        "referral_bonus_earned": settings.REFERRAL_BONUS_AMOUNT
    }
