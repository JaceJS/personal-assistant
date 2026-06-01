"""Finance domain HTTP router."""

from __future__ import annotations

import uuid
from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, Query, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import CurrentUser
from app.core.config import get_settings
from app.core.database import get_session
from app.core.exceptions import ForbiddenError
from app.core.response import ApiResponse, ok, paginated
from app.domains.finance import service
from app.domains.finance.schemas import (
    AccountCreate,
    AccountRead,
    AccountUpdate,
    BudgetRead,
    BudgetUpsert,
    CategoryCreate,
    CategoryRead,
    TransactionCreate,
    TransactionRead,
    TransactionUpdate,
    VoiceStatusRead,
    VoiceUploadResponse,
)
from app.shared.queue import create_redis_pool
from app.shared.storage import R2Storage

router = APIRouter(prefix="/api/v1", tags=["finance"])

DbSession = Annotated[AsyncSession, Depends(get_session)]


# Voice


@router.post(
    "/voice/upload",
    response_model=ApiResponse[VoiceUploadResponse],
    status_code=201,
)
async def upload_voice(
    user_id: CurrentUser,
    session: DbSession,
    account_id: Annotated[uuid.UUID, Form()],
    file: Annotated[UploadFile, File()],
) -> ApiResponse[VoiceUploadResponse]:
    settings = get_settings()
    redis = await create_redis_pool(settings)
    try:
        item = await service.create_voice_upload(
            session,
            user_id,
            account_id=account_id,
            file=file,
            storage=R2Storage(settings),
            redis=redis,
        )
    finally:
        await redis.close()
    return ok(item, message="created")


@router.get("/voice/{voice_log_id}", response_model=ApiResponse[VoiceStatusRead])
async def get_voice_status(
    voice_log_id: uuid.UUID, user_id: CurrentUser, session: DbSession
) -> ApiResponse[VoiceStatusRead]:
    item = await service.get_voice_status(session, user_id, voice_log_id)
    return ok(item)


# ── Budget ────────────────────────────────────────────────────────────────────

@router.get("/budget", response_model=ApiResponse[BudgetRead | None])
async def get_budget(user_id: CurrentUser, session: DbSession) -> ApiResponse[BudgetRead | None]:
    budget = await service.get_budget(session, user_id)
    return ok(budget)


@router.put("/budget", response_model=ApiResponse[BudgetRead])
async def upsert_budget(
    user_id: CurrentUser, session: DbSession, data: BudgetUpsert
) -> ApiResponse[BudgetRead]:
    budget = await service.upsert_budget(session, user_id, data)
    return ok(budget)


# ── Accounts ──────────────────────────────────────────────────────────────────

@router.get("/accounts", response_model=ApiResponse[list[AccountRead]])
async def list_accounts(user_id: CurrentUser, session: DbSession) -> ApiResponse[list[AccountRead]]:
    items = await service.list_accounts(session, user_id)
    return paginated(items, total=len(items), limit=len(items), offset=0)


@router.post("/accounts", response_model=ApiResponse[AccountRead], status_code=201)
async def create_account(
    user_id: CurrentUser, session: DbSession, data: AccountCreate
) -> ApiResponse[AccountRead]:
    item = await service.create_account(session, user_id, data)
    return ok(item, message="created")


@router.get("/accounts/{account_id}", response_model=ApiResponse[AccountRead])
async def get_account(
    account_id: uuid.UUID, user_id: CurrentUser, session: DbSession
) -> ApiResponse[AccountRead]:
    account = await service.get_account_or_404(session, account_id, user_id)
    return ok(account)


@router.patch("/accounts/{account_id}", response_model=ApiResponse[AccountRead])
async def update_account(
    account_id: uuid.UUID, user_id: CurrentUser, session: DbSession, data: AccountUpdate
) -> ApiResponse[AccountRead]:
    item = await service.update_account(session, user_id, account_id, data)
    return ok(item)


# ── Categories ────────────────────────────────────────────────────────────────

@router.get("/categories", response_model=ApiResponse[list[CategoryRead]])
async def list_categories(user_id: CurrentUser, session: DbSession) -> ApiResponse[list[CategoryRead]]:
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


# ── Transactions ──────────────────────────────────────────────────────────────

@router.get("/transactions", response_model=ApiResponse[list[TransactionRead]])
async def list_transactions(
    user_id: CurrentUser,
    session: DbSession,
    account_id: Annotated[uuid.UUID | None, Query()] = None,
    date_from: Annotated[date | None, Query()] = None,
    date_to: Annotated[date | None, Query()] = None,
    search: Annotated[str | None, Query(max_length=200)] = None,
    limit: Annotated[int, Query(ge=1, le=1000)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> ApiResponse[list[TransactionRead]]:
    items, total = await service.list_transactions(
        session, user_id,
        account_id=account_id, date_from=date_from, date_to=date_to,
        search=search, limit=limit, offset=offset,
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
