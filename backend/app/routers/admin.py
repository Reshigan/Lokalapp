from decimal import Decimal
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from app.database import get_db
from app.models.user import User, KYCStatus, UserStatus
from app.models.wallet import Wallet, WalletStatus
from app.models.agent import Agent, AgentTier, AgentStatus
from app.models.wifi_voucher import WiFiPackage, WiFiVoucher
from app.models.electricity import ElectricityPackage, ElectricityMeter
from app.models.transaction import Transaction, TransactionType, TransactionStatus
from app.services.auth import get_current_active_user

router = APIRouter(prefix="/admin", tags=["Admin"])


async def require_admin(current_user: User = Depends(get_current_active_user)) -> User:
    """Require admin privileges. For demo, check if user has admin email."""
    # In production, implement proper role-based access control
    if current_user.email and "admin" in current_user.email.lower():
        return current_user
    # For demo, allow all verified users to access admin
    if current_user.kyc_status == KYCStatus.VERIFIED:
        return current_user
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Admin access required"
    )


# ============ Dashboard Stats ============

@router.get("/dashboard/stats")
async def get_dashboard_stats(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Get dashboard statistics."""
    # User stats
    result = await db.execute(select(func.count()).select_from(User))
    total_users = result.scalar()
    
    result = await db.execute(
        select(func.count()).select_from(User)
        .where(User.created_at >= datetime.utcnow() - timedelta(days=30))
    )
    new_users_30d = result.scalar()
    
    result = await db.execute(
        select(func.count()).select_from(User)
        .where(User.kyc_status == KYCStatus.VERIFIED)
    )
    verified_users = result.scalar()
    
    # Agent stats
    result = await db.execute(
        select(func.count()).select_from(Agent)
        .where(Agent.status == AgentStatus.ACTIVE)
    )
    active_agents = result.scalar()
    
    # Transaction stats
    result = await db.execute(
        select(func.sum(Transaction.amount))
        .where(Transaction.status == TransactionStatus.COMPLETED)
        .where(Transaction.type == TransactionType.PURCHASE)
        .where(Transaction.amount < 0)
    )
    total_revenue = result.scalar() or 0
    
    result = await db.execute(
        select(func.sum(Transaction.amount))
        .where(Transaction.status == TransactionStatus.COMPLETED)
        .where(Transaction.type == TransactionType.PURCHASE)
        .where(Transaction.amount < 0)
        .where(Transaction.created_at >= datetime.utcnow() - timedelta(days=30))
    )
    revenue_30d = result.scalar() or 0
    
    # Wallet stats
    result = await db.execute(
        select(func.sum(Wallet.balance))
    )
    total_wallet_balance = result.scalar() or 0
    
    return {
        "users": {
            "total": total_users,
            "new_30_days": new_users_30d,
            "verified": verified_users
        },
        "agents": {
            "active": active_agents
        },
        "revenue": {
            "total": abs(float(total_revenue)),
            "last_30_days": abs(float(revenue_30d))
        },
        "wallets": {
            "total_balance": float(total_wallet_balance)
        }
    }


# ============ User Management ============

@router.get("/users")
async def list_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: str = None,
    kyc_status: KYCStatus = None,
    user_status: UserStatus = None,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """List all users with filtering."""
    query = select(User)
    count_query = select(func.count()).select_from(User)
    
    if search:
        search_filter = or_(
            User.phone_number.contains(search),
            User.first_name.ilike(f"%{search}%"),
            User.last_name.ilike(f"%{search}%"),
            User.email.ilike(f"%{search}%")
        )
        query = query.where(search_filter)
        count_query = count_query.where(search_filter)
    
    if kyc_status:
        query = query.where(User.kyc_status == kyc_status)
        count_query = count_query.where(User.kyc_status == kyc_status)
    
    if user_status:
        query = query.where(User.status == user_status)
        count_query = count_query.where(User.status == user_status)
    
    # Get total
    result = await db.execute(count_query)
    total = result.scalar()
    
    # Get paginated results
    offset = (page - 1) * page_size
    query = query.order_by(User.created_at.desc()).offset(offset).limit(page_size)
    result = await db.execute(query)
    users = result.scalars().all()
    
    return {
        "users": [
            {
                "id": u.id,
                "phone_number": u.phone_number,
                "first_name": u.first_name,
                "last_name": u.last_name,
                "email": u.email,
                "kyc_status": u.kyc_status.value,
                "status": u.status.value,
                "loyalty_points": u.loyalty_points,
                "created_at": u.created_at.isoformat()
            }
            for u in users
        ],
        "total": total,
        "page": page,
        "page_size": page_size
    }


@router.get("/users/{user_id}")
async def get_user_details(
    user_id: str,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Get detailed user information."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get wallet
    result = await db.execute(select(Wallet).where(Wallet.user_id == user_id))
    wallet = result.scalar_one_or_none()
    
    # Get agent profile if exists
    result = await db.execute(select(Agent).where(Agent.user_id == user_id))
    agent = result.scalar_one_or_none()
    
    # Get recent transactions
    if wallet:
        result = await db.execute(
            select(Transaction)
            .where(Transaction.wallet_id == wallet.id)
            .order_by(Transaction.created_at.desc())
            .limit(10)
        )
        transactions = result.scalars().all()
    else:
        transactions = []
    
    return {
        "user": {
            "id": user.id,
            "phone_number": user.phone_number,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "email": user.email,
            "kyc_status": user.kyc_status.value,
            "status": user.status.value,
            "loyalty_points": user.loyalty_points,
            "referral_code": user.referral_code,
            "created_at": user.created_at.isoformat()
        },
        "wallet": {
            "id": wallet.id,
            "balance": float(wallet.balance),
            "status": wallet.status.value
        } if wallet else None,
        "agent": {
            "id": agent.id,
            "agent_code": agent.agent_code,
            "business_name": agent.business_name,
            "tier": agent.tier.value,
            "float_balance": float(agent.float_balance),
            "commission_balance": float(agent.commission_balance),
            "status": agent.status.value
        } if agent else None,
        "recent_transactions": [
            {
                "id": t.id,
                "type": t.type.value,
                "amount": float(t.amount),
                "status": t.status.value,
                "created_at": t.created_at.isoformat()
            }
            for t in transactions
        ]
    }


@router.put("/users/{user_id}/status")
async def update_user_status(
    user_id: str,
    new_status: UserStatus,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Update user status (activate/suspend/deactivate)."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user.status = new_status
    await db.commit()
    
    return {"message": f"User status updated to {new_status.value}"}


@router.put("/users/{user_id}/kyc")
async def update_kyc_status(
    user_id: str,
    new_status: KYCStatus,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Update user KYC status."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user.kyc_status = new_status
    await db.commit()
    
    return {"message": f"KYC status updated to {new_status.value}"}


@router.post("/users/{user_id}/wallet/adjust")
async def adjust_wallet(
    user_id: str,
    amount: float,
    reason: str,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Adjust user wallet balance (credit or debit)."""
    result = await db.execute(select(Wallet).where(Wallet.user_id == user_id))
    wallet = result.scalar_one_or_none()
    
    if not wallet:
        raise HTTPException(status_code=404, detail="Wallet not found")
    
    balance_before = wallet.balance
    wallet.balance += Decimal(str(amount))
    
    if wallet.balance < 0:
        raise HTTPException(status_code=400, detail="Adjustment would result in negative balance")
    
    # Create adjustment transaction
    from app.utils.security import generate_transaction_reference
    transaction = Transaction(
        wallet_id=wallet.id,
        type=TransactionType.REFUND if amount > 0 else TransactionType.PURCHASE,
        amount=Decimal(str(amount)),
        fee=Decimal("0.00"),
        balance_before=balance_before,
        balance_after=wallet.balance,
        reference=generate_transaction_reference(),
        status=TransactionStatus.COMPLETED,
        description=f"Admin adjustment: {reason}"
    )
    db.add(transaction)
    await db.commit()
    
    return {
        "message": "Wallet adjusted",
        "new_balance": float(wallet.balance),
        "adjustment": amount
    }


# ============ Agent Management ============

@router.get("/agents")
async def list_agents(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    tier: AgentTier = None,
    agent_status: AgentStatus = None,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """List all agents."""
    query = select(Agent, User).join(User, Agent.user_id == User.id)
    count_query = select(func.count()).select_from(Agent)
    
    if tier:
        query = query.where(Agent.tier == tier)
        count_query = count_query.where(Agent.tier == tier)
    
    if agent_status:
        query = query.where(Agent.status == agent_status)
        count_query = count_query.where(Agent.status == agent_status)
    
    result = await db.execute(count_query)
    total = result.scalar()
    
    offset = (page - 1) * page_size
    query = query.order_by(Agent.created_at.desc()).offset(offset).limit(page_size)
    result = await db.execute(query)
    rows = result.all()
    
    return {
        "agents": [
            {
                "id": agent.id,
                "agent_code": agent.agent_code,
                "business_name": agent.business_name,
                "business_type": agent.business_type.value,
                "tier": agent.tier.value,
                "float_balance": float(agent.float_balance),
                "commission_balance": float(agent.commission_balance),
                "total_sales": float(agent.total_sales),
                "monthly_sales": float(agent.monthly_sales),
                "status": agent.status.value,
                "user_phone": user.phone_number,
                "user_name": f"{user.first_name or ''} {user.last_name or ''}".strip(),
                "created_at": agent.created_at.isoformat()
            }
            for agent, user in rows
        ],
        "total": total,
        "page": page,
        "page_size": page_size
    }


@router.put("/agents/{agent_id}/tier")
async def update_agent_tier(
    agent_id: str,
    new_tier: AgentTier,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Update agent tier."""
    result = await db.execute(select(Agent).where(Agent.id == agent_id))
    agent = result.scalar_one_or_none()
    
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    agent.tier = new_tier
    await db.commit()
    
    return {"message": f"Agent tier updated to {new_tier.value}"}


@router.put("/agents/{agent_id}/status")
async def update_agent_status(
    agent_id: str,
    new_status: AgentStatus,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Update agent status."""
    result = await db.execute(select(Agent).where(Agent.id == agent_id))
    agent = result.scalar_one_or_none()
    
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    agent.status = new_status
    await db.commit()
    
    return {"message": f"Agent status updated to {new_status.value}"}


@router.post("/agents/{agent_id}/float/adjust")
async def adjust_agent_float(
    agent_id: str,
    amount: float,
    reason: str,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Adjust agent float balance."""
    result = await db.execute(select(Agent).where(Agent.id == agent_id))
    agent = result.scalar_one_or_none()
    
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    agent.float_balance += Decimal(str(amount))
    
    if agent.float_balance < 0:
        raise HTTPException(status_code=400, detail="Adjustment would result in negative float")
    
    await db.commit()
    
    return {
        "message": "Float adjusted",
        "new_balance": float(agent.float_balance),
        "adjustment": amount
    }


# ============ Product Management ============

@router.get("/products/wifi")
async def list_wifi_packages(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """List all WiFi packages."""
    result = await db.execute(
        select(WiFiPackage).order_by(WiFiPackage.sort_order, WiFiPackage.price)
    )
    packages = result.scalars().all()
    
    return [
        {
            "id": p.id,
            "name": p.name,
            "description": p.description,
            "price": float(p.price),
            "data_limit_mb": p.data_limit_mb,
            "validity_hours": p.validity_hours,
            "is_active": p.is_active == 1,
            "sort_order": p.sort_order
        }
        for p in packages
    ]


@router.post("/products/wifi")
async def create_wifi_package(
    name: str,
    price: float,
    data_limit_mb: int,
    validity_hours: int,
    description: str = None,
    sort_order: int = 0,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Create a new WiFi package."""
    package = WiFiPackage(
        name=name,
        description=description,
        price=Decimal(str(price)),
        data_limit_mb=data_limit_mb,
        validity_hours=validity_hours,
        sort_order=sort_order
    )
    db.add(package)
    await db.commit()
    
    return {"message": "Package created", "id": package.id}


@router.put("/products/wifi/{package_id}")
async def update_wifi_package(
    package_id: str,
    name: str = None,
    price: float = None,
    data_limit_mb: int = None,
    validity_hours: int = None,
    description: str = None,
    is_active: bool = None,
    sort_order: int = None,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Update a WiFi package."""
    result = await db.execute(select(WiFiPackage).where(WiFiPackage.id == package_id))
    package = result.scalar_one_or_none()
    
    if not package:
        raise HTTPException(status_code=404, detail="Package not found")
    
    if name is not None:
        package.name = name
    if price is not None:
        package.price = Decimal(str(price))
    if data_limit_mb is not None:
        package.data_limit_mb = data_limit_mb
    if validity_hours is not None:
        package.validity_hours = validity_hours
    if description is not None:
        package.description = description
    if is_active is not None:
        package.is_active = 1 if is_active else 0
    if sort_order is not None:
        package.sort_order = sort_order
    
    await db.commit()
    
    return {"message": "Package updated"}


@router.get("/products/electricity")
async def list_electricity_packages(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """List all electricity packages."""
    result = await db.execute(
        select(ElectricityPackage).order_by(ElectricityPackage.sort_order, ElectricityPackage.price)
    )
    packages = result.scalars().all()
    
    return [
        {
            "id": p.id,
            "name": p.name,
            "description": p.description,
            "price": float(p.price),
            "kwh_amount": float(p.kwh_amount),
            "is_active": p.is_active == 1,
            "sort_order": p.sort_order
        }
        for p in packages
    ]


@router.post("/products/electricity")
async def create_electricity_package(
    name: str,
    price: float,
    kwh_amount: float,
    description: str = None,
    sort_order: int = 0,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Create a new electricity package."""
    package = ElectricityPackage(
        name=name,
        description=description,
        price=Decimal(str(price)),
        kwh_amount=Decimal(str(kwh_amount)),
        sort_order=sort_order
    )
    db.add(package)
    await db.commit()
    
    return {"message": "Package created", "id": package.id}


# ============ Reports ============

@router.get("/reports/revenue")
async def get_revenue_report(
    days: int = Query(30, ge=1, le=365),
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Get revenue report."""
    since = datetime.utcnow() - timedelta(days=days)
    
    # Get daily revenue
    result = await db.execute(
        select(
            func.date(Transaction.created_at).label("date"),
            func.sum(Transaction.amount).label("amount")
        )
        .where(Transaction.status == TransactionStatus.COMPLETED)
        .where(Transaction.type == TransactionType.PURCHASE)
        .where(Transaction.amount < 0)
        .where(Transaction.created_at >= since)
        .group_by(func.date(Transaction.created_at))
        .order_by(func.date(Transaction.created_at))
    )
    daily_revenue = result.all()
    
    # Get revenue by product type
    result = await db.execute(
        select(Transaction)
        .where(Transaction.status == TransactionStatus.COMPLETED)
        .where(Transaction.type == TransactionType.PURCHASE)
        .where(Transaction.amount < 0)
        .where(Transaction.created_at >= since)
    )
    transactions = result.scalars().all()
    
    wifi_revenue = 0
    electricity_revenue = 0
    other_revenue = 0
    
    for t in transactions:
        amount = abs(float(t.amount))
        if t.extra_data and t.extra_data.get("product_type") == "WIFI":
            wifi_revenue += amount
        elif t.extra_data and t.extra_data.get("product_type") == "ELECTRICITY":
            electricity_revenue += amount
        else:
            other_revenue += amount
    
    return {
        "period_days": days,
        "daily_revenue": [
            {"date": str(d), "amount": abs(float(a))}
            for d, a in daily_revenue
        ],
        "by_product": {
            "wifi": wifi_revenue,
            "electricity": electricity_revenue,
            "other": other_revenue
        },
        "total": wifi_revenue + electricity_revenue + other_revenue
    }


@router.get("/reports/agents")
async def get_agent_performance_report(
    days: int = Query(30, ge=1, le=365),
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Get agent performance report."""
    since = datetime.utcnow() - timedelta(days=days)
    
    result = await db.execute(
        select(Agent, User)
        .join(User, Agent.user_id == User.id)
        .where(Agent.status == AgentStatus.ACTIVE)
        .order_by(Agent.monthly_sales.desc())
        .limit(20)
    )
    rows = result.all()
    
    return {
        "period_days": days,
        "top_agents": [
            {
                "agent_code": agent.agent_code,
                "business_name": agent.business_name,
                "tier": agent.tier.value,
                "total_sales": float(agent.total_sales),
                "monthly_sales": float(agent.monthly_sales),
                "commission_balance": float(agent.commission_balance)
            }
            for agent, user in rows
        ]
    }
