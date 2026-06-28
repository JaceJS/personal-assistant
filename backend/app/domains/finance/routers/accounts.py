import uuid

from fastapi import APIRouter

from app.core.auth import CurrentUser
from app.core.response import ApiResponse, ok, paginated
from app.domains.finance import service
from app.domains.finance.routers.deps import DbSession
from app.domains.finance.schemas import AccountCreate, AccountRead, AccountUpdate

router = APIRouter(tags=["Accounts"])


@router.get("/accounts", response_model=ApiResponse[list[AccountRead]])
async def list_accounts(user_id: CurrentUser, session: DbSession) -> ApiResponse[list[AccountRead]]:
    items = await service.list_accounts(session, user_id)
    return paginated(items, total=len(items), limit=len(items), offset=0)  # type: ignore[arg-type]


@router.post("/accounts", response_model=ApiResponse[AccountRead], status_code=201)
async def create_account(
    user_id: CurrentUser, session: DbSession, data: AccountCreate
) -> ApiResponse[AccountRead]:
    item = await service.create_account(session, user_id, data)
    return ok(item, message="created")  # type: ignore[arg-type]


@router.get("/accounts/{account_id}", response_model=ApiResponse[AccountRead])
async def get_account(
    account_id: uuid.UUID, user_id: CurrentUser, session: DbSession
) -> ApiResponse[AccountRead]:
    account = await service.get_account_or_404(session, account_id, user_id)
    return ok(account)  # type: ignore[arg-type]


@router.patch("/accounts/{account_id}", response_model=ApiResponse[AccountRead])
async def update_account(
    account_id: uuid.UUID, user_id: CurrentUser, session: DbSession, data: AccountUpdate
) -> ApiResponse[AccountRead]:
    item = await service.update_account(session, user_id, account_id, data)
    return ok(item)  # type: ignore[arg-type]
