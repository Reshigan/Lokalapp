from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.user import User, OTPCode, RefreshToken
from app.models.wallet import Wallet
from app.schemas.auth import (
    OTPRequest,
    OTPVerify,
    PINLogin,
    PINSet,
    TokenResponse,
    RefreshRequest,
)
from app.utils.security import (
    generate_otp,
    generate_referral_code,
    hash_pin,
    verify_pin,
    create_access_token,
    create_refresh_token,
    decode_token,
)
from app.config import settings
from app.services.auth import get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/otp/request", status_code=status.HTTP_200_OK)
async def request_otp(request: OTPRequest, db: AsyncSession = Depends(get_db)):
    """Request an OTP for phone number verification."""
    # Check for existing unexpired OTP
    result = await db.execute(
        select(OTPCode)
        .where(OTPCode.phone_number == request.phone_number)
        .where(OTPCode.expires_at > datetime.utcnow())
        .where(OTPCode.used == 0)
    )
    existing_otp = result.scalar_one_or_none()
    
    if existing_otp and existing_otp.attempts >= settings.OTP_MAX_ATTEMPTS:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many OTP requests. Please wait before trying again."
        )
    
    # Generate new OTP
    otp_code = generate_otp()
    expires_at = datetime.utcnow() + timedelta(minutes=settings.OTP_EXPIRE_MINUTES)
    
    # Invalidate existing OTPs
    if existing_otp:
        existing_otp.used = 1
    
    # Create new OTP record
    new_otp = OTPCode(
        phone_number=request.phone_number,
        code=otp_code,
        expires_at=expires_at
    )
    db.add(new_otp)
    await db.commit()
    
    # In production, send SMS via gateway
    # For now, return OTP in response (remove in production)
    return {
        "message": "OTP sent successfully",
        "expires_in": settings.OTP_EXPIRE_MINUTES * 60,
        "debug_otp": otp_code  # Remove in production
    }


@router.post("/otp/verify", response_model=TokenResponse)
async def verify_otp(request: OTPVerify, db: AsyncSession = Depends(get_db)):
    """Verify OTP and return authentication tokens."""
    # Find valid OTP
    result = await db.execute(
        select(OTPCode)
        .where(OTPCode.phone_number == request.phone_number)
        .where(OTPCode.expires_at > datetime.utcnow())
        .where(OTPCode.used == 0)
        .order_by(OTPCode.created_at.desc())
    )
    otp_record = result.scalar_one_or_none()
    
    if not otp_record:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired OTP"
        )
    
    # Check attempts
    otp_record.attempts += 1
    if otp_record.attempts > settings.OTP_MAX_ATTEMPTS:
        otp_record.used = 1
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Maximum OTP attempts exceeded"
        )
    
    # Verify OTP
    if otp_record.code != request.code:
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid OTP"
        )
    
    # Mark OTP as used
    otp_record.used = 1
    
    # Find or create user
    result = await db.execute(
        select(User).where(User.phone_number == request.phone_number)
    )
    user = result.scalar_one_or_none()
    is_new_user = False
    
    if not user:
        is_new_user = True
        user = User(
            phone_number=request.phone_number,
            referral_code=generate_referral_code()
        )
        db.add(user)
        await db.flush()
        
        # Create wallet for new user
        wallet = Wallet(user_id=user.id)
        db.add(wallet)
    
    # Create tokens
    access_token = create_access_token({"sub": user.id})
    refresh_token_str = create_refresh_token({"sub": user.id})
    
    # Store refresh token
    refresh_token = RefreshToken(
        user_id=user.id,
        token=refresh_token_str,
        expires_at=datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    )
    db.add(refresh_token)
    
    await db.commit()
    
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token_str,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user_id=user.id,
        is_new_user=is_new_user
    )


@router.post("/pin/login", response_model=TokenResponse)
async def pin_login(request: PINLogin, db: AsyncSession = Depends(get_db)):
    """Login with phone number and PIN."""
    result = await db.execute(
        select(User).where(User.phone_number == request.phone_number)
    )
    user = result.scalar_one_or_none()
    
    if not user or not user.pin_hash:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )
    
    if not verify_pin(request.pin, user.pin_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )
    
    # Create tokens
    access_token = create_access_token({"sub": user.id})
    refresh_token_str = create_refresh_token({"sub": user.id})
    
    # Store refresh token
    refresh_token = RefreshToken(
        user_id=user.id,
        token=refresh_token_str,
        expires_at=datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    )
    db.add(refresh_token)
    await db.commit()
    
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token_str,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user_id=user.id,
        is_new_user=False
    )


@router.post("/pin/set", status_code=status.HTTP_200_OK)
async def set_pin(
    request: PINSet,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Set or update user PIN."""
    if request.pin != request.confirm_pin:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="PINs do not match"
        )
    
    current_user.pin_hash = hash_pin(request.pin)
    await db.commit()
    
    return {"message": "PIN set successfully"}


@router.post("/refresh", response_model=TokenResponse)
async def refresh_tokens(request: RefreshRequest, db: AsyncSession = Depends(get_db)):
    """Refresh access token using refresh token."""
    payload = decode_token(request.refresh_token)
    
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )
    
    # Verify refresh token exists and is not revoked
    result = await db.execute(
        select(RefreshToken)
        .where(RefreshToken.token == request.refresh_token)
        .where(RefreshToken.revoked == 0)
        .where(RefreshToken.expires_at > datetime.utcnow())
    )
    token_record = result.scalar_one_or_none()
    
    if not token_record:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token"
        )
    
    # Revoke old refresh token
    token_record.revoked = 1
    
    # Get user
    result = await db.execute(
        select(User).where(User.id == payload["sub"])
    )
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )
    
    # Create new tokens
    access_token = create_access_token({"sub": user.id})
    refresh_token_str = create_refresh_token({"sub": user.id})
    
    # Store new refresh token
    new_refresh_token = RefreshToken(
        user_id=user.id,
        token=refresh_token_str,
        expires_at=datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    )
    db.add(new_refresh_token)
    await db.commit()
    
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token_str,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user_id=user.id,
        is_new_user=False
    )


@router.post("/logout", status_code=status.HTTP_200_OK)
async def logout(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Logout and invalidate all refresh tokens."""
    # Revoke all refresh tokens for user
    result = await db.execute(
        select(RefreshToken)
        .where(RefreshToken.user_id == current_user.id)
        .where(RefreshToken.revoked == 0)
    )
    tokens = result.scalars().all()
    
    for token in tokens:
        token.revoked = 1
    
    await db.commit()
    
    return {"message": "Logged out successfully"}
