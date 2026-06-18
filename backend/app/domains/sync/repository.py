"""Sync domain repository — idempotent bulk inserts via ON CONFLICT DO NOTHING."""

from __future__ import annotations

import uuid

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.finance.models import (
    Account,
    Budget,
    Category,
    Transaction,
    TransactionStatus,
)
from app.domains.sync.schemas import (
    AccountImport,
    BudgetImport,
    CategoryImport,
    TransactionImport,
)


async def import_accounts(
    session: AsyncSession, user_id: uuid.UUID, accounts: list[AccountImport]
) -> int:
    if not accounts:
        return 0
    stmt = (
        pg_insert(Account)
        .values(
            [
                {
                    "id": a.id,
                    "user_id": user_id,
                    "name": a.name,
                    "type": a.type,
                    "currency": a.currency,
                }
                for a in accounts
            ]
        )
        .on_conflict_do_nothing(index_elements=["id"])
    )
    result = await session.execute(stmt)
    await session.flush()
    return result.rowcount


async def import_categories(
    session: AsyncSession, user_id: uuid.UUID, categories: list[CategoryImport]
) -> int:
    if not categories:
        return 0
    stmt = (
        pg_insert(Category)
        .values(
            [
                {
                    "id": c.id,
                    "user_id": user_id,
                    "name": c.name,
                    "type": c.type,
                    "icon": c.icon,
                    "color": c.color,
                }
                for c in categories
            ]
        )
        .on_conflict_do_nothing(index_elements=["id"])
    )
    result = await session.execute(stmt)
    await session.flush()
    return result.rowcount


async def import_transactions(
    session: AsyncSession, user_id: uuid.UUID, transactions: list[TransactionImport]
) -> int:
    if not transactions:
        return 0
    stmt = (
        pg_insert(Transaction)
        .values(
            [
                {
                    "id": t.id,
                    "user_id": user_id,
                    "account_id": t.account_id,
                    "category_id": t.category_id,
                    "amount": t.amount,
                    "currency": t.currency,
                    "merchant": t.merchant,
                    "note": t.note,
                    "occurred_at": t.occurred_at,
                    "source": t.source,
                    "status": TransactionStatus.confirmed,
                }
                for t in transactions
            ]
        )
        .on_conflict_do_nothing(index_elements=["id"])
    )
    result = await session.execute(stmt)
    await session.flush()
    return result.rowcount


async def import_budget(
    session: AsyncSession, user_id: uuid.UUID, budget: BudgetImport | None
) -> int:
    if budget is None:
        return 0
    stmt = (
        pg_insert(Budget)
        .values(user_id=user_id, monthly_limit=budget.monthly_limit)
        .on_conflict_do_update(
            index_elements=["user_id"],
            set_={"monthly_limit": budget.monthly_limit, "updated_at": sa.func.now()},
        )
    )
    await session.execute(stmt)
    await session.flush()
    return 1
