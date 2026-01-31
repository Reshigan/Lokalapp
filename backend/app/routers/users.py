from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.user import User, KYCStatus
from app.schemas.user import UserUpdate, UserResponse, KYCSubmit, LoyaltyResponse
from app.services.auth import get_current_user, get_current_active_user

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("/me", response_model=UserResponse)
async def get_current_user_profile(
    current_user: User = Depends(get_current_active_user)
):
    """Get current user profile."""
    return UserResponse(
        id=current_user.id,
        phone_number=current_user.phone_number,
        first_name=current_user.first_name,
        last_name=current_user.last_name,
        email=current_user.email,
        kyc_status=current_user.kyc_status,
        status=current_user.status,
        referral_code=current_user.referral_code,
        loyalty_points=current_user.loyalty_points,
        has_pin=current_user.pin_hash is not None,
        created_at=current_user.created_at
    )


@router.put("/me", response_model=UserResponse)
async def update_user_profile(
    update_data: UserUpdate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Update current user profile."""
    if update_data.first_name is not None:
        current_user.first_name = update_data.first_name
    if update_data.last_name is not None:
        current_user.last_name = update_data.last_name
    if update_data.email is not None:
        current_user.email = update_data.email
    
    await db.commit()
    await db.refresh(current_user)
    
    return UserResponse(
        id=current_user.id,
        phone_number=current_user.phone_number,
        first_name=current_user.first_name,
        last_name=current_user.last_name,
        email=current_user.email,
        kyc_status=current_user.kyc_status,
        status=current_user.status,
        referral_code=current_user.referral_code,
        loyalty_points=current_user.loyalty_points,
        has_pin=current_user.pin_hash is not None,
        created_at=current_user.created_at
    )


@router.post("/kyc", status_code=status.HTTP_200_OK)
async def submit_kyc(
    kyc_data: KYCSubmit,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Submit KYC documents for verification."""
    if current_user.kyc_status == KYCStatus.VERIFIED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="KYC already verified"
        )
    
    # Update user details
    current_user.first_name = kyc_data.first_name
    current_user.last_name = kyc_data.last_name
    current_user.id_number = kyc_data.id_number  # Should be encrypted in production
    
    # In production, store documents and trigger verification
    # For now, auto-approve for demo
    current_user.kyc_status = KYCStatus.VERIFIED
    
    await db.commit()
    
    return {
        "message": "KYC submitted successfully",
        "status": current_user.kyc_status.value
    }


@router.get("/referral-code")
async def get_referral_code(
    current_user: User = Depends(get_current_active_user)
):
    """Get user's referral code."""
    return {
        "referral_code": current_user.referral_code,
        "referral_link": f"https://lokal.vantax.co.za/register?ref={current_user.referral_code}"
    }


@router.get("/loyalty", response_model=LoyaltyResponse)
async def get_loyalty_status(
    current_user: User = Depends(get_current_active_user)
):
    """Get user's loyalty points and status."""
    points = current_user.loyalty_points
    
    # Determine tier based on points
    if points >= 10000:
        tier = "Platinum"
        next_tier_points = 0
    elif points >= 5000:
        tier = "Gold"
        next_tier_points = 10000 - points
    elif points >= 1000:
        tier = "Silver"
        next_tier_points = 5000 - points
    else:
        tier = "Bronze"
        next_tier_points = 1000 - points
    
    # Calculate available rewards (100 points = R1 discount)
    rewards_available = points // 100
    
    return LoyaltyResponse(
        points=points,
        tier=tier,
        next_tier_points=max(0, next_tier_points),
        rewards_available=rewards_available
    )
