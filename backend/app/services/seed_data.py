from decimal import Decimal
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.wifi_voucher import WiFiPackage
from app.models.electricity import ElectricityPackage


async def seed_wifi_packages(db: AsyncSession):
    """Seed default WiFi packages."""
    packages = [
        WiFiPackage(
            name="Daily Lite",
            description="500MB valid for 24 hours",
            price=Decimal("5.00"),
            data_limit_mb=500,
            validity_hours=24,
            sort_order=1
        ),
        WiFiPackage(
            name="Daily Standard",
            description="1GB valid for 24 hours",
            price=Decimal("10.00"),
            data_limit_mb=1024,
            validity_hours=24,
            sort_order=2
        ),
        WiFiPackage(
            name="Weekly Value",
            description="3GB valid for 7 days",
            price=Decimal("25.00"),
            data_limit_mb=3072,
            validity_hours=168,
            sort_order=3
        ),
        WiFiPackage(
            name="Weekly Plus",
            description="7GB valid for 7 days",
            price=Decimal("50.00"),
            data_limit_mb=7168,
            validity_hours=168,
            sort_order=4
        ),
        WiFiPackage(
            name="Monthly Essential",
            description="15GB valid for 30 days",
            price=Decimal("99.00"),
            data_limit_mb=15360,
            validity_hours=720,
            sort_order=5
        ),
        WiFiPackage(
            name="Monthly Premium",
            description="30GB valid for 30 days",
            price=Decimal("179.00"),
            data_limit_mb=30720,
            validity_hours=720,
            sort_order=6
        ),
    ]
    
    for package in packages:
        db.add(package)
    
    await db.commit()


async def seed_electricity_packages(db: AsyncSession):
    """Seed default electricity packages."""
    packages = [
        ElectricityPackage(
            name="Basic 10 kWh",
            description="10 units of electricity",
            price=Decimal("25.00"),
            kwh_amount=Decimal("10.00"),
            sort_order=1
        ),
        ElectricityPackage(
            name="Standard 20 kWh",
            description="20 units of electricity",
            price=Decimal("48.00"),
            kwh_amount=Decimal("20.00"),
            sort_order=2
        ),
        ElectricityPackage(
            name="Value 50 kWh",
            description="50 units of electricity",
            price=Decimal("115.00"),
            kwh_amount=Decimal("50.00"),
            sort_order=3
        ),
        ElectricityPackage(
            name="Family 100 kWh",
            description="100 units of electricity",
            price=Decimal("220.00"),
            kwh_amount=Decimal("100.00"),
            sort_order=4
        ),
        ElectricityPackage(
            name="Bulk 200 kWh",
            description="200 units of electricity",
            price=Decimal("420.00"),
            kwh_amount=Decimal("200.00"),
            sort_order=5
        ),
    ]
    
    for package in packages:
        db.add(package)
    
    await db.commit()


async def seed_all(db: AsyncSession):
    """Seed all default data."""
    await seed_wifi_packages(db)
    await seed_electricity_packages(db)
