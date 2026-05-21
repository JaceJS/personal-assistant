"""Finance domain HTTP router """

from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import CurrentUser
from app.core.database import get_session
from app.core.exceptions import ForbiddenError
from app.domains.finance import service
from app.domains.finance.models import Account, Category, Transaction
from app.domains.finance.schemas import (
    AccountCreate,
    AccountRead,
    AccountUpdate,
    CategoryCreate,
    CategoryRead,
    TransactionCreate,
    TransactionRead,
    TransactionUpdate,
)

router = APIRouter(prefix="/api/v1", tags=["finance"])

DbSession = Annotated[AsyncSession, Depends(get_session)]


# ── Accounts ──────────────────────────────────────────────────────────────────

@router.get("/accounts", response_model=list[AccountRead])
async def list_accounts(user_id: CurrentUser, session: DbSession) -> list[Account]:
    return await service.list_accounts(session, user_id)


@router.post("/accounts", response_model=AccountRead, status_code=201)
async def create_account(
    user_id: CurrentUser, session: DbSession, data: AccountCreate
) -> Account:
    return await service.create_account(session, user_id, data)


@router.get("/accounts/{account_id}", response_model=AccountRead)
async def get_account(
    account_id: uuid.UUID, user_id: CurrentUser, session: DbSession
) -> Account:
    account = await service.get_account_or_404(session, account_id)
    if account.user_id != user_id:
        raise ForbiddenError("You don't own this account")
    return account


@router.patch("/accounts/{account_id}", response_model=AccountRead)
async def update_account(
    account_id: uuid.UUID, user_id: CurrentUser, session: DbSession, data: AccountUpdate
) -> Account:
    return await service.update_account(session, user_id, account_id, data)


# ── Categories ────────────────────────────────────────────────────────────────

@router.get("/categories", response_model=list[CategoryRead])
async def list_categories(user_id: CurrentUser, session: DbSession) -> list[Category]:
    return await service.list_categories(session, user_id)


@router.post("/categories", response_model=CategoryRead, status_code=201)
async def create_category(
    user_id: CurrentUser, session: DbSession, data: CategoryCreate
) -> Category:
    return await service.create_category(session, user_id, data)


@router.get("/categories/{category_id}", response_model=CategoryRead)
async def get_category(
    category_id: uuid.UUID, user_id: CurrentUser, session: DbSession
) -> Category:
    return await service.get_category_or_404(session, category_id)


# ── Transactions ──────────────────────────────────────────────────────────────

@router.get("/transactions", response_model=list[TransactionRead])
async def list_transactions(
    user_id: CurrentUser,
    session: DbSession,
    account_id: Annotated[uuid.UUID | None, Query()] = None,
    limit: Annotated[int, Query(ge=1, le=200)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> list[Transaction]:
    return await service.list_transactions(
        session, user_id, account_id=account_id, limit=limit, offset=offset
    )


@router.post("/transactions", response_model=TransactionRead, status_code=201)
async def create_transaction(
    user_id: CurrentUser, session: DbSession, data: TransactionCreate
) -> Transaction:
    return await service.create_transaction(session, user_id, data)


@router.get("/transactions/{transaction_id}", response_model=TransactionRead)
async def get_transaction(
    transaction_id: uuid.UUID, user_id: CurrentUser, session: DbSession
) -> Transaction:
    tx = await service.get_transaction_or_404(session, transaction_id)
    if tx.user_id != user_id:
        raise ForbiddenError("You don't own this transaction")
    return tx


@router.patch("/transactions/{transaction_id}", response_model=TransactionRead)
async def update_transaction(
    transaction_id: uuid.UUID, user_id: CurrentUser, session: DbSession, data: TransactionUpdate
) -> Transaction:
    return await service.update_transaction(session, user_id, transaction_id, data)


@router.delete("/transactions/{transaction_id}", status_code=204)
async def delete_transaction(
    transaction_id: uuid.UUID, user_id: CurrentUser, session: DbSession
) -> None:
    await service.delete_transaction(session, user_id, transaction_id)
