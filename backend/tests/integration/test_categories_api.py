"""Integration tests: category access control (ownership + system defaults)."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.finance import repository as repo
from app.domains.finance.models import AccountType, CategoryType

pytestmark = pytest.mark.integration


async def test_get_category_forbidden_for_other_users_category(
    client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    other_user = uuid.uuid4()
    category = await repo.create_category(
        db_session, other_user, name="Private", type=CategoryType.expense,
    )
    await db_session.commit()

    response = await client.get(f"/api/v1/categories/{category.id}")

    assert response.status_code == 403


async def test_get_system_default_category_is_readable(
    client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    # System defaults have user_id IS NULL and are shared by everyone.
    category = await repo.create_category(
        db_session, None, name="Groceries", type=CategoryType.expense,
    )
    await db_session.commit()

    response = await client.get(f"/api/v1/categories/{category.id}")

    assert response.status_code == 200
    assert response.json()["name"] == "Groceries"


async def test_create_transaction_forbidden_with_other_users_category(
    client: AsyncClient,
    db_session: AsyncSession,
    test_user_id: uuid.UUID,
) -> None:
    account = await repo.create_account(
        db_session, test_user_id,
        name="Dompet", type=AccountType.cash, currency="IDR",
    )
    other_user = uuid.uuid4()
    foreign_category = await repo.create_category(
        db_session, other_user, name="Private", type=CategoryType.expense,
    )
    await db_session.commit()

    payload = {
        "account_id": str(account.id),
        "category_id": str(foreign_category.id),
        "amount": -10_000,
        "occurred_at": datetime.now(UTC).isoformat(),
    }
    response = await client.post("/api/v1/transactions", json=payload)

    assert response.status_code == 403


async def test_create_transaction_allows_own_category(
    client: AsyncClient,
    db_session: AsyncSession,
    test_user_id: uuid.UUID,
) -> None:
    account = await repo.create_account(
        db_session, test_user_id,
        name="Dompet", type=AccountType.cash, currency="IDR",
    )
    category = await repo.create_category(
        db_session, test_user_id, name="Food", type=CategoryType.expense,
    )
    await db_session.commit()

    payload = {
        "account_id": str(account.id),
        "category_id": str(category.id),
        "amount": -10_000,
        "occurred_at": datetime.now(UTC).isoformat(),
    }
    response = await client.post("/api/v1/transactions", json=payload)

    assert response.status_code == 201
