import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    # App settings
    APP_NAME: str = "Lokal Platform"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = os.getenv("DEBUG", "false").lower() == "true"
    
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./lokal.db")
    
    # JWT settings
    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", "lokal-super-secret-key-change-in-production")
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # OTP settings
    OTP_EXPIRE_MINUTES: int = 5
    OTP_MAX_ATTEMPTS: int = 3
    PIN_MAX_ATTEMPTS: int = 5
    
    # SMS Gateway (Clickatell/BulkSMS)
    SMS_API_KEY: str = os.getenv("SMS_API_KEY", "")
    SMS_API_URL: str = os.getenv("SMS_API_URL", "https://api.clickatell.com/rest/message")
    
    # Payment Gateways
    OZOW_SITE_CODE: str = os.getenv("OZOW_SITE_CODE", "")
    OZOW_PRIVATE_KEY: str = os.getenv("OZOW_PRIVATE_KEY", "")
    OZOW_API_KEY: str = os.getenv("OZOW_API_KEY", "")
    
    PAYFAST_MERCHANT_ID: str = os.getenv("PAYFAST_MERCHANT_ID", "")
    PAYFAST_MERCHANT_KEY: str = os.getenv("PAYFAST_MERCHANT_KEY", "")
    PAYFAST_PASSPHRASE: str = os.getenv("PAYFAST_PASSPHRASE", "")
    
    # UniFi Controller
    UNIFI_CONTROLLER_URL: str = os.getenv("UNIFI_CONTROLLER_URL", "")
    UNIFI_USERNAME: str = os.getenv("UNIFI_USERNAME", "")
    UNIFI_PASSWORD: str = os.getenv("UNIFI_PASSWORD", "")
    UNIFI_SITE_ID: str = os.getenv("UNIFI_SITE_ID", "default")
    
    # Agent settings
    MIN_FLOAT_DEPOSIT: float = 500.00
    FLOAT_ADVANCE_LIMIT: float = 10000.00
    
    # Referral bonus
    REFERRAL_BONUS_AMOUNT: float = 10.00
    
    # Rate limiting
    RATE_LIMIT_REQUESTS: int = 100
    RATE_LIMIT_WINDOW: int = 60  # seconds


settings = Settings()
