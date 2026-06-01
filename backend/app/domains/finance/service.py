"""Finance domain service — ownership checks and account balance management."""

from __future__ import annotations

import uuid
from datetime import date

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ForbiddenError, NotFoundError
from app.domains.finance import repository as repo
from app.domains.finance.models import Account, Budget, Category, Transaction, TransactionStatus
from app.domains.finance.schemas import (
    AccountCreate,
    AccountUpdate,
    BudgetUpsert,
    CategoryCreate,
    TransactionCreate,
    TransactionUpdate,
)

# ── Budget ────────────────────────────────────────────────────────────────────

async def get_budget(session: AsyncSession, user_id: uuid.UUID) -> Budget | None:
    return await repo.get_budget(session, user_id)


async def upsert_budget(
    session: AsyncSession, user_id: uuid.UUID, data: BudgetUpsert
) -> Budget:
    return await repo.upsert_budget(session, user_id, data.monthly_limit)


# ── Accounts ──────────────────────────────────────────────────────────────────

async def get_account_or_404(
    session: AsyncSession, account_id: uuid.UUID, user_id: uuid.UUID
) -> Account:
    account = await repo.get_account(session, account_id)
    if account is None:
        raise NotFoundError(f"Account {account_id} not found")
    if account.user_id != user_id:
        raise ForbiddenError("You don't own this account")
    return account


async def list_accounts(session: AsyncSession, user_id: uuid.UUID) -> list[Account]:
    return await repo.list_accounts(session, user_id)


async def create_account(
    session: AsyncSession, user_id: uuid.UUID, data: AccountCreate
) -> Account:
    return await repo.create_account(
        session, user_id, name=data.name, type=data.type, currency=data.currency
    )


async def update_account(
    session: AsyncSession, user_id: uuid.UUID, account_id: uuid.UUID, data: AccountUpdate
) -> Account:
    account = await get_account_or_404(session, account_id, user_id)
    return await repo.update_account(session, account, **data.model_dump(exclude_unset=True))


# ── Categories ────────────────────────────────────────────────────────────────

async def get_category_or_404(
    session: AsyncSession, category_id: uuid.UUID, user_id: uuid.UUID
) -> Category:
    """Return a category the user may access, else raise.

    System-default categories (user_id IS NULL) are shared and readable by everyone;
    user-owned categories are only accessible to their owner.
    """
    category = await repo.get_category(session, category_id)
    if category is None:
        raise NotFoundError(f"Category {category_id} not found")
    if category.user_id is not None and category.user_id != user_id:
        raise ForbiddenError("You don't own this category")
    return category


async def list_categories(session: AsyncSession, user_id: uuid.UUID) -> list[Category]:
    return await repo.list_categories(session, user_id)


async def create_category(
    session: AsyncSession, user_id: uuid.UUID, data: CategoryCreate
) -> Category:
    return await repo.create_category(
        session, user_id,
        name=data.name, type=data.type, icon=data.icon, color=data.color,
    )


# ── Transactions ──────────────────────────────────────────────────────────────

async def get_transaction_or_404(session: AsyncSession, tx_id: uuid.UUID) -> Transaction:
    tx = await repo.get_transaction(session, tx_id)
    if tx is None:
        raise NotFoundError(f"Transaction {tx_id} not found")
    return tx


async def list_transactions(
    session: AsyncSession,
    user_id: uuid.UUID,
    *,
    account_id: uuid.UUID | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    search: str | None = None,
    limit: int = 50,
    offset: int = 0,
) -> tuple[list[Transaction], int]:
    items = await repo.list_transactions(
        session, user_id,
        account_id=account_id, date_from=date_from, date_to=date_to,
        search=search, limit=limit, offset=offset,
    )
    total = await repo.count_transactions(
        session, user_id,
        account_id=account_id, date_from=date_from, date_to=date_to,
        search=search,
    )
    return items, total


async def create_transaction(
    session: AsyncSession, user_id: uuid.UUID, data: TransactionCreate
) -> Transaction:
    account = await get_account_or_404(session, data.account_id)
    if account.user_id != user_id:
        raise ForbiddenError("You don't own this account")

    if data.category_id is not None:
        await get_category_or_404(session, data.category_id, user_id)

    tx = await repo.create_transaction(
        session, user_id,
        account_id=data.account_id,
        category_id=data.category_id,
        amount=data.amount,
        currency=data.currency,
        merchant=data.merchant,
        note=data.note,
        occurred_at=data.occurred_at,
        source=data.source,
        status=data.status,
        voice_log_id=data.voice_log_id,
    )
    if data.status == TransactionStatus.confirmed:
        await repo.update_account(session, account, balance=account.balance + data.amount)
    return tx


async def update_transaction(
    session: AsyncSession, user_id: uuid.UUID, tx_id: uuid.UUID, data: TransactionUpdate
) -> Transaction:
    tx = await get_transaction_or_404(session, tx_id)
    if tx.user_id != user_id:
        raise ForbiddenError("You don't own this transaction")

    # Capture the balance contribution before applying updates.
    old_balance_effect = tx.amount if tx.status == TransactionStatus.confirmed else 0

    updates = data.model_dump(exclude_unset=True)
    if updates.get("category_id") is not None:
        await get_category_or_404(session, updates["category_id"], user_id)
    updated = await repo.update_transaction(session, tx, **updates)

    new_balance_effect = updated.amount if updated.status == TransactionStatus.confirmed else 0
    if old_balance_effect != new_balance_effect:
        account = await get_account_or_404(session, updated.account_id)
        delta = new_balance_effect - old_balance_effect
        await repo.update_account(session, account, balance=account.balance + delta)

    return updated


async def delete_transaction(
    session: AsyncSession, user_id: uuid.UUID, tx_id: uuid.UUID
) -> None:
    tx = await get_transaction_or_404(session, tx_id)
    if tx.user_id != user_id:
        raise ForbiddenError("You don't own this transaction")

    if tx.status == TransactionStatus.confirmed:
        account = await get_account_or_404(session, tx.account_id)
        await repo.update_account(session, account, balance=account.balance - tx.amount)

    await repo.delete_transaction(session, tx)
