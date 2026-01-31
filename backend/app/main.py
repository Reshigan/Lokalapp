from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select

from app.database import init_db, async_session_maker
from app.models.wifi_voucher import WiFiPackage
from app.routers import (
    auth_router,
    users_router,
    wallet_router,
    wifi_router,
    electricity_router,
    agent_router,
    admin_router,
)
from app.routers.settings import router as settings_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize database on startup
    await init_db()
    
    # Seed default data if not exists
    async with async_session_maker() as db:
        result = await db.execute(select(WiFiPackage).limit(1))
        if not result.scalar_one_or_none():
            from app.services.seed_data import seed_all
            await seed_all(db)
    
    yield


app = FastAPI(
    title="Lokal Platform API",
    description="Digital wallet and services platform for South African communities",
    version="1.0.0",
    lifespan=lifespan
)

# Disable CORS. Do not remove this for full-stack development.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

# Include routers
app.include_router(auth_router)
app.include_router(users_router)
app.include_router(wallet_router)
app.include_router(wifi_router)
app.include_router(electricity_router)
app.include_router(agent_router)
app.include_router(admin_router)
app.include_router(settings_router)


@app.get("/healthz")
async def healthz():
    return {"status": "ok"}


@app.get("/")
async def root():
    return {
        "name": "Lokal Platform API",
        "version": "1.0.0",
        "description": "Digital wallet and services platform for South African communities",
        "docs": "/docs",
        "endpoints": {
            "auth": "/auth",
            "users": "/users",
            "wallet": "/wallet",
            "wifi": "/wifi",
            "electricity": "/electricity",
            "agent": "/agent",
            "admin": "/admin"
        }
    }
