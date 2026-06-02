import uuid
from datetime import date
from typing import Annotated

from fastapi import APIRouter, Query

from app.core.auth import CurrentUser
from app.core.exceptions import ForbiddenError
from app.core.response import ApiResponse, ok, paginated
from app.domains.finance import service
from app.domains.finance.models import TransactionStatus
from app.domains.finance.routers.deps import DbSession
from app.domains.finance.schemas import TransactionCreate, TransactionRead, TransactionUpdate

router = APIRouter(tags=["Transactions"])


@router.get("/transactions", response_model=ApiResponse[list[TransactionRead]])
async def list_transactions(
    user_id: CurrentUser,
    session: DbSession,
    account_id: Annotated[uuid.UUID | None, Query()] = None,
    date_from: Annotated[date | None, Query()] = None,
    date_to: Annotated[date | None, Query()] = None,
    search: Annotated[str | None, Query(max_length=200)] = None,
    status: Annotated[TransactionStatus | None, Query()] = None,
    limit: Annotated[int, Query(ge=1, le=1000)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> ApiResponse[list[TransactionRead]]:
    items, total = await service.list_transactions(
        session, user_id,
        account_id=account_id, date_from=date_from, date_to=date_to,
        search=search, status=status, limit=limit, offset=offset,
    )
    return paginated(items, total=total, limit=limit, offset=offset)


@router.post("/transactions", response_model=ApiResponse[TransactionRead], status_code=201)
async def create_transaction(
    user_id: CurrentUser, session: DbSession, data: TransactionCreate
) -> ApiResponse[TransactionRead]:
    item = await service.create_transaction(session, user_id, data)
    return ok(item, message="created")


@router.get("/transactions/{transaction_id}", response_model=ApiResponse[TransactionRead])
async def get_transaction(
    transaction_id: uuid.UUID, user_id: CurrentUser, session: DbSession
) -> ApiResponse[TransactionRead]:
    tx = await service.get_transaction_or_404(session, transaction_id)
    if tx.user_id != user_id:
        raise ForbiddenError("You don't own this transaction")
    return ok(tx)


@router.patch("/transactions/{transaction_id}", response_model=ApiResponse[TransactionRead])
async def update_transaction(
    transaction_id: uuid.UUID, user_id: CurrentUser, session: DbSession, data: TransactionUpdate
) -> ApiResponse[TransactionRead]:
    item = await service.update_transaction(session, user_id, transaction_id, data)
    return ok(item)


@router.delete("/transactions/{transaction_id}", status_code=204)
async def delete_transaction(
    transaction_id: uuid.UUID, user_id: CurrentUser, session: DbSession
) -> None:
    await service.delete_transaction(session, user_id, transaction_id)
