from app.routers.auth import router as auth_router
from app.routers.users import router as users_router
from app.routers.wallet import router as wallet_router
from app.routers.wifi import router as wifi_router
from app.routers.electricity import router as electricity_router
from app.routers.agent import router as agent_router
from app.routers.admin import router as admin_router

__all__ = [
    "auth_router",
    "users_router",
    "wallet_router",
    "wifi_router",
    "electricity_router",
    "agent_router",
    "admin_router",
]
