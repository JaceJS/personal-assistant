import uuid

from fastapi import APIRouter

from app.core.auth import CurrentUser
from app.core.response import ApiResponse, ok, paginated
from app.domains.finance import service
from app.domains.finance.routers.deps import DbSession
from app.domains.finance.schemas import (
    SavingsGoalContribute,
    SavingsGoalCreate,
    SavingsGoalRead,
    SavingsGoalUpdate,
)

router = APIRouter(tags=["Savings Goals"])


@router.get("/savings-goals", response_model=ApiResponse[list[SavingsGoalRead]])
async def list_savings_goals(
    user_id: CurrentUser, session: DbSession
) -> ApiResponse[list[SavingsGoalRead]]:
    goals = await service.list_savings_goals(session, user_id)
    items = [SavingsGoalRead.from_model(g) for g in goals]
    return paginated(items, total=len(items), limit=len(items), offset=0)


@router.post("/savings-goals", response_model=ApiResponse[SavingsGoalRead], status_code=201)
async def create_savings_goal(
    user_id: CurrentUser, session: DbSession, data: SavingsGoalCreate
) -> ApiResponse[SavingsGoalRead]:
    goal = await service.create_savings_goal(session, user_id, data)
    return ok(SavingsGoalRead.from_model(goal))


@router.get("/savings-goals/{goal_id}", response_model=ApiResponse[SavingsGoalRead])
async def get_savings_goal(
    goal_id: uuid.UUID, user_id: CurrentUser, session: DbSession
) -> ApiResponse[SavingsGoalRead]:
    goal = await service.get_savings_goal(session, goal_id, user_id)
    return ok(SavingsGoalRead.from_model(goal))


@router.patch("/savings-goals/{goal_id}", response_model=ApiResponse[SavingsGoalRead])
async def update_savings_goal(
    goal_id: uuid.UUID, user_id: CurrentUser, session: DbSession, data: SavingsGoalUpdate
) -> ApiResponse[SavingsGoalRead]:
    goal = await service.update_savings_goal(session, goal_id, user_id, data)
    return ok(SavingsGoalRead.from_model(goal))


@router.post("/savings-goals/{goal_id}/contribute", response_model=ApiResponse[SavingsGoalRead])
async def contribute_to_savings_goal(
    goal_id: uuid.UUID, user_id: CurrentUser, session: DbSession, data: SavingsGoalContribute
) -> ApiResponse[SavingsGoalRead]:
    goal = await service.contribute_to_savings_goal(session, goal_id, user_id, data)
    return ok(SavingsGoalRead.from_model(goal))


@router.delete("/savings-goals/{goal_id}", status_code=204)
async def delete_savings_goal(
    goal_id: uuid.UUID, user_id: CurrentUser, session: DbSession
) -> None:
    await service.delete_savings_goal(session, goal_id, user_id)
