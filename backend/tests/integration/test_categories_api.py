"""Integration tests: category access control (ownership + system defaults)."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

import pytest
import sqlalchemy as sa
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.finance import repository as repo
from app.domains.finance.models import AccountType, Category, CategoryType

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
    assert response.json()["data"]["name"] == "Groceries"


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


# ── Update category ───────────────────────────────────────────────────────────

async def test_update_own_category_success(
    client: AsyncClient,
    db_session: AsyncSession,
    test_user_id: uuid.UUID,
) -> None:
    category = await repo.create_category(
        db_session, test_user_id, name="Old", type=CategoryType.expense,
    )
    await db_session.commit()

    response = await client.patch(f"/api/v1/categories/{category.id}", json={"name": "New"})

    assert response.status_code == 200
    assert response.json()["data"]["name"] == "New"


async def test_update_system_category_is_forbidden(
    client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    # System categories (user_id=NULL) are shared seed data; no user owns them.
    system = await repo.create_category(
        db_session, None, name="System", type=CategoryType.expense,
    )
    await db_session.commit()

    response = await client.patch(f"/api/v1/categories/{system.id}", json={"name": "Hacked"})

    assert response.status_code == 403


async def test_update_other_users_category_is_forbidden(
    client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    other = uuid.uuid4()
    category = await repo.create_category(
        db_session, other, name="Private", type=CategoryType.expense,
    )
    await db_session.commit()

    response = await client.patch(f"/api/v1/categories/{category.id}", json={"name": "Hacked"})

    assert response.status_code == 403


async def test_update_nonexistent_category_is_not_found(
    client: AsyncClient,
) -> None:
    response = await client.patch(f"/api/v1/categories/{uuid.uuid4()}", json={"name": "X"})

    assert response.status_code == 404


# ── Archive category ──────────────────────────────────────────────────────────

async def test_archive_own_category_returns_204(
    client: AsyncClient,
    db_session: AsyncSession,
    test_user_id: uuid.UUID,
) -> None:
    category = await repo.create_category(
        db_session, test_user_id, name="ToBye", type=CategoryType.expense,
    )
    await db_session.commit()

    response = await client.delete(f"/api/v1/categories/{category.id}")

    assert response.status_code == 204


async def test_archive_removes_category_from_list(
    client: AsyncClient,
    db_session: AsyncSession,
    test_user_id: uuid.UUID,
) -> None:
    category = await repo.create_category(
        db_session, test_user_id, name="ToBye", type=CategoryType.expense,
    )
    await db_session.commit()

    await client.delete(f"/api/v1/categories/{category.id}")
    response = await client.get("/api/v1/categories")

    names = [c["name"] for c in response.json()["data"]]
    assert "ToBye" not in names


async def test_archive_system_category_is_forbidden(
    client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    system = await repo.create_category(
        db_session, None, name="Sys", type=CategoryType.expense,
    )
    await db_session.commit()

    response = await client.delete(f"/api/v1/categories/{system.id}")

    assert response.status_code == 403


async def test_archive_other_users_category_is_forbidden(
    client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    other = uuid.uuid4()
    category = await repo.create_category(
        db_session, other, name="Private", type=CategoryType.expense,
    )
    await db_session.commit()

    response = await client.delete(f"/api/v1/categories/{category.id}")

    assert response.status_code == 403


async def test_archive_nonexistent_category_is_not_found(
    client: AsyncClient,
) -> None:
    response = await client.delete(f"/api/v1/categories/{uuid.uuid4()}")

    assert response.status_code == 404


# ── Fixed expense flag ────────────────────────────────────────────────────────

async def test_mark_category_as_fixed(
    client: AsyncClient,
    db_session: AsyncSession,
    test_user_id: uuid.UUID,
) -> None:
    cat = await repo.create_category(
        db_session, test_user_id, name="Rent", type=CategoryType.expense,
    )
    await db_session.commit()

    response = await client.patch(
        f"/api/v1/categories/{cat.id}",
        json={"is_fixed": True, "budget_limit": 3_000_000},
    )

    assert response.status_code == 200
    data = response.json()["data"]
    assert data["is_fixed"] is True
    assert data["budget_limit"] == 3_000_000


async def test_unmark_category_as_fixed(
    client: AsyncClient,
    db_session: AsyncSession,
    test_user_id: uuid.UUID,
) -> None:
    cat = await repo.create_category(
        db_session, test_user_id, name="Rent", type=CategoryType.expense,
    )
    await db_session.commit()
    await client.patch(f"/api/v1/categories/{cat.id}", json={"is_fixed": True})

    response = await client.patch(f"/api/v1/categories/{cat.id}", json={"is_fixed": False})

    assert response.status_code == 200
    assert response.json()["data"]["is_fixed"] is False


async def test_new_category_is_not_fixed_by_default(
    client: AsyncClient,
    db_session: AsyncSession,
    test_user_id: uuid.UUID,
) -> None:
    cat = await repo.create_category(
        db_session, test_user_id, name="Food", type=CategoryType.expense,
    )
    await db_session.commit()

    response = await client.get(f"/api/v1/categories/{cat.id}")

    assert response.status_code == 200
    assert response.json()["data"]["is_fixed"] is False


# ── Lazy seeding ──────────────────────────────────────────────────────────────

async def _clear_system_categories(session: AsyncSession) -> None:
    await session.execute(sa.delete(Category).where(Category.user_id.is_(None)))
    await session.commit()


async def test_list_categories_seeds_defaults_on_first_call(
    client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    await _clear_system_categories(db_session)
    await repo.create_category(db_session, None, name="Food", type=CategoryType.expense)
    await repo.create_category(db_session, None, name="Salary", type=CategoryType.income)
    await db_session.commit()

    response = await client.get("/api/v1/categories")

    assert response.status_code == 200
    names = [c["name"] for c in response.json()["data"]]
    assert "Food" in names
    assert "Salary" in names


async def test_list_categories_seeded_are_user_owned(
    client: AsyncClient,
    db_session: AsyncSession,
    test_user_id: uuid.UUID,
) -> None:
    await _clear_system_categories(db_session)
    await repo.create_category(db_session, None, name="Food", type=CategoryType.expense)
    await db_session.commit()

    response = await client.get("/api/v1/categories")
    data = response.json()["data"]

    assert len(data) > 0
    assert all(c["user_id"] == str(test_user_id) for c in data)


async def test_list_categories_does_not_double_seed(
    client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    await _clear_system_categories(db_session)
    await repo.create_category(db_session, None, name="Food", type=CategoryType.expense)
    await db_session.commit()

    await client.get("/api/v1/categories")
    response = await client.get("/api/v1/categories")

    names = [c["name"] for c in response.json()["data"]]
    assert names.count("Food") == 1
