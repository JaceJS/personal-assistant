"""Integration tests for AI tool executors against a real Postgres database.

These exist because the Decimal-vs-int bug the unit tests target (mocked DB
sessions) can only be reproduced against a real driver: PostgreSQL's SUM()
over a bigint column returns asyncpg Decimal, not int, and only a real round
trip proves json.dumps() no longer raises on the tool result.
"""

from __future__ import annotations

import json
import uuid
from datetime import UTC, date, datetime

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.ai.tools import (
    _format_month_year,
    _get_budget_status,
    _get_financial_summary,
    _get_recent_transactions,
    _get_spending_by_category,
)
from app.domains.finance import repository as repo
from app.domains.finance.models import (
    AccountType,
    CategoryType,
    TransactionSource,
    TransactionStatus,
)

pytestmark = pytest.mark.integration


async def _seed_account(session: AsyncSession, user_id: uuid.UUID) -> uuid.UUID:
    account = await repo.create_account(
        session, user_id, name="Dompet", type=AccountType.cash, currency="IDR"
    )
    await session.flush()
    return account.id


async def _seed_transaction(
    session: AsyncSession,
    user_id: uuid.UUID,
    account_id: uuid.UUID,
    *,
    amount: int,
    category_id: uuid.UUID | None = None,
) -> None:
    await repo.create_transaction(
        session,
        user_id,
        account_id=account_id,
        category_id=category_id,
        amount=amount,
        currency="IDR",
        occurred_at=datetime.now(UTC),
        source=TransactionSource.manual,
        status=TransactionStatus.confirmed,
    )
    await session.flush()


async def test_get_financial_summary_json_serializable_against_real_db(
    db_session: AsyncSession, test_user_id: uuid.UUID
) -> None:
    account_id = await _seed_account(db_session, test_user_id)
    await _seed_transaction(db_session, test_user_id, account_id, amount=2_000_000)
    await _seed_transaction(db_session, test_user_id, account_id, amount=-750_000)
    await db_session.commit()

    result = await _get_financial_summary(test_user_id, db_session)
    json.dumps(result)  # would raise TypeError on unconverted Decimal

    assert result["month_income"] == 2_000_000
    assert result["month_expense"] == 750_000
    assert result["month_income_formatted"] == "Rp 2.000.000"
    assert result["month"] == _format_month_year(date.today())


async def test_get_budget_status_json_serializable_against_real_db(
    db_session: AsyncSession, test_user_id: uuid.UUID
) -> None:
    account_id = await _seed_account(db_session, test_user_id)
    await _seed_transaction(db_session, test_user_id, account_id, amount=-300_000)
    await repo.upsert_budget(db_session, test_user_id, monthly_limit=1_000_000)
    await db_session.commit()

    result = await _get_budget_status(test_user_id, db_session)
    json.dumps(result)

    assert result["month_spent"] == 300_000
    assert result["remaining"] == 700_000


async def test_get_spending_by_category_json_serializable_against_real_db(
    db_session: AsyncSession, test_user_id: uuid.UUID
) -> None:
    account_id = await _seed_account(db_session, test_user_id)
    category = await repo.create_category(
        db_session, test_user_id, name="Makan", type=CategoryType.expense, icon="utensils"
    )
    await db_session.flush()
    await _seed_transaction(
        db_session, test_user_id, account_id, amount=-125_000, category_id=category.id
    )
    await db_session.commit()

    result = await _get_spending_by_category(test_user_id, db_session)
    json.dumps(result)

    assert result["categories"][0]["amount"] == 125_000


async def test_get_spending_by_category_falls_back_to_indonesian_uncategorized_label(
    db_session: AsyncSession, test_user_id: uuid.UUID
) -> None:
    """Regression test for a query bug where calling coalesce() twice (once
    in SELECT, once in GROUP BY) created two different bind parameters and
    Postgres rejected the query with GroupingError — this crashed every
    spending-by-category call, always. Also proves the fallback label is now
    Indonesian, not the English "Uncategorized" literal."""
    account_id = await _seed_account(db_session, test_user_id)
    await _seed_transaction(db_session, test_user_id, account_id, amount=-40_000)
    await db_session.commit()

    result = await _get_spending_by_category(test_user_id, db_session)

    assert result["categories"][0]["name"] == "Tanpa Kategori"
    assert result["categories"][0]["amount"] == 40_000


async def test_get_recent_transactions_type_filter_returns_only_income(
    db_session: AsyncSession, test_user_id: uuid.UUID
) -> None:
    account_id = await _seed_account(db_session, test_user_id)
    await _seed_transaction(db_session, test_user_id, account_id, amount=5_000_000)
    await _seed_transaction(db_session, test_user_id, account_id, amount=-50_000)
    await db_session.commit()

    result = await _get_recent_transactions(test_user_id, db_session, tx_type="income")

    assert result["count"] == 1
    assert result["transactions"][0]["amount"] == 5_000_000


async def test_get_recent_transactions_type_filter_returns_only_expense(
    db_session: AsyncSession, test_user_id: uuid.UUID
) -> None:
    account_id = await _seed_account(db_session, test_user_id)
    await _seed_transaction(db_session, test_user_id, account_id, amount=5_000_000)
    await _seed_transaction(db_session, test_user_id, account_id, amount=-50_000)
    await db_session.commit()

    result = await _get_recent_transactions(test_user_id, db_session, tx_type="expense")

    assert result["count"] == 1
    assert result["transactions"][0]["amount"] == -50_000
