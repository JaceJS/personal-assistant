import uuid

from fastapi import APIRouter

from app.core.auth import CurrentUser
from app.core.response import ApiResponse, ok, paginated
from app.domains.finance import service
from app.domains.finance.routers.deps import DbSession
from app.domains.finance.schemas import CategoryCreate, CategoryRead

router = APIRouter(tags=["Categories"])


@router.get("/categories", response_model=ApiResponse[list[CategoryRead]])
async def list_categories(
    user_id: CurrentUser, session: DbSession
) -> ApiResponse[list[CategoryRead]]:
    items = await service.list_categories(session, user_id)
    return paginated(items, total=len(items), limit=len(items), offset=0)


@router.post("/categories", response_model=ApiResponse[CategoryRead], status_code=201)
async def create_category(
    user_id: CurrentUser, session: DbSession, data: CategoryCreate
) -> ApiResponse[CategoryRead]:
    item = await service.create_category(session, user_id, data)
    return ok(item, message="created")


@router.get("/categories/{category_id}", response_model=ApiResponse[CategoryRead])
async def get_category(
    category_id: uuid.UUID, user_id: CurrentUser, session: DbSession
) -> ApiResponse[CategoryRead]:
    item = await service.get_category_or_404(session, category_id, user_id)
    return ok(item)
