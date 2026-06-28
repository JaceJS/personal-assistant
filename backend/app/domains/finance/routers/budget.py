from fastapi import APIRouter

from app.core.auth import CurrentUser
from app.core.response import ApiResponse, ok
from app.domains.finance import service
from app.domains.finance.routers.deps import DbSession
from app.domains.finance.schemas import BudgetRead, BudgetUpsert

router = APIRouter(tags=["Budget"])


@router.get("/budget", response_model=ApiResponse[BudgetRead | None])
async def get_budget(user_id: CurrentUser, session: DbSession) -> ApiResponse[BudgetRead | None]:
    budget = await service.get_budget(session, user_id)
    return ok(budget)  # type: ignore[arg-type]


@router.put("/budget", response_model=ApiResponse[BudgetRead])
async def upsert_budget(
    user_id: CurrentUser, session: DbSession, data: BudgetUpsert
) -> ApiResponse[BudgetRead]:
    budget = await service.upsert_budget(session, user_id, data)
    return ok(budget)  # type: ignore[arg-type]
