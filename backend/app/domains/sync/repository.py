"""Sync domain repository for idempotent bulk inserts via ON CONFLICT DO NOTHING."""

from __future__ import annotations

import uuid
from typing import Any, cast

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.engine import CursorResult
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.finance.models import (
    Account,
    Budget,
    Category,
    SavingsGoal,
    Transaction,
    TransactionStatus,
)
from app.domains.sync.schemas import (
    AccountImport,
    BudgetImport,
    CategoryImport,
    SavingsGoalImport,
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
                    "initial_balance": a.initial_balance,
                    # Transaction deltas are applied by the service after
                    # import_transactions, on top of this starting point.
                    "balance": a.initial_balance,
                }
                for a in accounts
            ]
        )
        .on_conflict_do_nothing(index_elements=["id"])
    )
    result = await session.execute(stmt)
    await session.flush()
    return cast("CursorResult[Any]", result).rowcount


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
    return cast("CursorResult[Any]", result).rowcount


async def get_owned_account_ids(
    session: AsyncSession, user_id: uuid.UUID, account_ids: set[uuid.UUID]
) -> set[uuid.UUID]:
    """Return the subset of `account_ids` that belong to `user_id`."""
    if not account_ids:
        return set()
    stmt = sa.select(Account.id).where(Account.user_id == user_id, Account.id.in_(account_ids))
    result = await session.execute(stmt)
    return set(result.scalars().all())


async def get_owned_category_ids(
    session: AsyncSession, user_id: uuid.UUID, category_ids: set[uuid.UUID]
) -> set[uuid.UUID]:
    """Return the subset of `category_ids` visible to `user_id`.

    Visible = owned by the user, or a system-default category (user_id IS NULL).
    """
    if not category_ids:
        return set()
    stmt = sa.select(Category.id).where(
        sa.or_(Category.user_id == user_id, Category.user_id.is_(None)),
        Category.id.in_(category_ids),
    )
    result = await session.execute(stmt)
    return set(result.scalars().all())


async def import_transactions(
    session: AsyncSession, user_id: uuid.UUID, transactions: list[TransactionImport]
) -> list[tuple[uuid.UUID, int]]:
    """Insert transactions; return (account_id, amount) for rows actually inserted.

    RETURNING only yields newly inserted rows (conflicts are skipped), so the
    caller can apply balance deltas without double-counting on re-import.
    """
    if not transactions:
        return []
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
        .returning(Transaction.account_id, Transaction.amount)
    )
    result = await session.execute(stmt)
    await session.flush()
    return [(row.account_id, row.amount) for row in result]


async def import_budget(
    session: AsyncSession, user_id: uuid.UUID, budget: BudgetImport | None
) -> int:
    if budget is None:
        return 0
    stmt = (
        pg_insert(Budget)
        .values(user_id=user_id, monthly_limit=budget.monthly_limit)
        .on_conflict_do_nothing(index_elements=["user_id"])
    )
    result = await session.execute(stmt)
    await session.flush()
    return cast("CursorResult[Any]", result).rowcount


async def import_savings_goals(
    session: AsyncSession, user_id: uuid.UUID, goals: list[SavingsGoalImport]
) -> int:
    if not goals:
        return 0
    stmt = (
        pg_insert(SavingsGoal)
        .values(
            [
                {
                    "id": g.id,
                    "user_id": user_id,
                    "name": g.name,
                    "icon": g.icon,
                    "target_amount": g.target_amount,
                    "current_amount": g.current_amount,
                    "target_date": g.target_date,
                    "is_archived": False,
                }
                for g in goals
            ]
        )
        .on_conflict_do_nothing(index_elements=["id"])
    )
    result = await session.execute(stmt)
    await session.flush()
    return cast("CursorResult[Any]", result).rowcount
