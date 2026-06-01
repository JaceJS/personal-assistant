"""Finance domain HTTP router — aggregates sub-routers by resource."""

from fastapi import APIRouter

from app.domains.finance.routers.accounts import router as accounts_router
from app.domains.finance.routers.budget import router as budget_router
from app.domains.finance.routers.categories import router as categories_router
from app.domains.finance.routers.transactions import router as transactions_router
from app.domains.finance.routers.voice import router as voice_router

router = APIRouter(prefix="/api/v1")
router.include_router(voice_router)
router.include_router(budget_router)
router.include_router(accounts_router)
router.include_router(categories_router)
router.include_router(transactions_router)
