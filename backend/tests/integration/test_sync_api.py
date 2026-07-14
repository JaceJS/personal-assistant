"""Integration tests: sync/import endpoint."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.finance import repository as repo
from app.domains.finance.models import AccountType, CategoryType
from app.main import app as fastapi_app

pytestmark = pytest.mark.integration


async def test_import_creates_accounts(
    client: AsyncClient,
    test_user_id: uuid.UUID,
) -> None:
    account_id = uuid.uuid4()
    payload = {
        "accounts": [{"id": str(account_id), "name": "Wallet", "type": "cash"}],
        "categories": [],
        "transactions": [],
        "budget": None,
    }

    response = await client.post("/api/v1/sync/import", json=payload)

    assert response.status_code == 200
    assert response.json()["data"]["imported"]["accounts"] == 1


async def test_import_is_idempotent(client: AsyncClient) -> None:
    account_id = uuid.uuid4()
    payload = {
        "accounts": [{"id": str(account_id), "name": "Wallet", "type": "cash"}],
        "categories": [],
        "transactions": [],
        "budget": None,
    }

    await client.post("/api/v1/sync/import", json=payload)
    response = await client.post("/api/v1/sync/import", json=payload)

    assert response.status_code == 200
    assert response.json()["data"]["imported"]["accounts"] == 0


async def test_import_creates_categories(client: AsyncClient) -> None:
    cat_id = uuid.uuid4()
    payload = {
        "accounts": [],
        "categories": [{"id": str(cat_id), "name": "Food", "type": "expense"}],
        "transactions": [],
        "budget": None,
    }

    response = await client.post("/api/v1/sync/import", json=payload)

    assert response.status_code == 200
    assert response.json()["data"]["imported"]["categories"] == 1


async def test_import_creates_transactions(
    client: AsyncClient,
    db_session: AsyncSession,
    test_user_id: uuid.UUID,
) -> None:
    account = await repo.create_account(
        db_session, test_user_id, name="Wallet", type=AccountType.cash, currency="IDR"
    )
    await db_session.commit()

    tx_id = uuid.uuid4()
    payload = {
        "accounts": [],
        "categories": [],
        "transactions": [
            {
                "id": str(tx_id),
                "account_id": str(account.id),
                "amount": -50000,
                "occurred_at": datetime(2024, 1, 15, 12, 0, 0, tzinfo=UTC).isoformat(),
                "source": "manual",
            }
        ],
        "budget": None,
    }

    response = await client.post("/api/v1/sync/import", json=payload)

    assert response.status_code == 200
    assert response.json()["data"]["imported"]["transactions"] == 1


async def test_import_creates_budget(client: AsyncClient) -> None:
    payload = {
        "accounts": [],
        "categories": [],
        "transactions": [],
        "budget": {"id": str(uuid.uuid4()), "monthly_limit": 5_000_000},
    }

    response = await client.post("/api/v1/sync/import", json=payload)

    assert response.status_code == 200
    assert response.json()["data"]["imported"]["budgets"] == 1


async def test_reimport_does_not_overwrite_existing_budget(client: AsyncClient) -> None:
    """Server-wins on conflict, same semantics as accounts/categories/transactions.

    A guest re-syncing (e.g. after "Nanti Dulu" then logging in again) must never
    let a stale local budget clobber a value the user already changed on the server.
    """
    first_payload = {
        "accounts": [],
        "categories": [],
        "transactions": [],
        "budget": {"id": str(uuid.uuid4()), "monthly_limit": 5_000_000},
    }
    await client.post("/api/v1/sync/import", json=first_payload)

    second_payload = {
        "accounts": [],
        "categories": [],
        "transactions": [],
        "budget": {"id": str(uuid.uuid4()), "monthly_limit": 2_000_000},
    }
    response = await client.post("/api/v1/sync/import", json=second_payload)

    assert response.status_code == 200
    assert response.json()["data"]["imported"]["budgets"] == 0

    detail = await client.get("/api/v1/budget")
    assert detail.json()["data"]["monthly_limit"] == 5_000_000


async def test_import_handles_empty_payload(client: AsyncClient) -> None:
    payload = {"accounts": [], "categories": [], "transactions": [], "budget": None}

    response = await client.post("/api/v1/sync/import", json=payload)

    assert response.status_code == 200
    data = response.json()["data"]["imported"]
    assert data == {
        "accounts": 0,
        "categories": 0,
        "transactions": 0,
        "budgets": 0,
        "savings_goals": 0,
    }


async def test_import_requires_auth() -> None:
    from app.main import app

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post(
            "/api/v1/sync/import",
            json={"accounts": [], "categories": [], "transactions": [], "budget": None},
        )

    assert response.status_code == 401


async def test_import_account_stores_initial_balance(client: AsyncClient) -> None:
    account_id = uuid.uuid4()
    payload = {
        "accounts": [
            {"id": str(account_id), "name": "BCA", "type": "bank", "initial_balance": 500_000}
        ],
        "categories": [],
        "transactions": [],
        "budget": None,
    }

    response = await client.post("/api/v1/sync/import", json=payload)
    assert response.status_code == 200

    detail = await client.get(f"/api/v1/accounts/{account_id}")
    assert detail.status_code == 200
    data = detail.json()["data"]
    assert data["initial_balance"] == 500_000
    assert data["balance"] == 500_000


async def test_import_applies_transactions_to_account_balance(client: AsyncClient) -> None:
    account_id = uuid.uuid4()
    payload = {
        "accounts": [
            {"id": str(account_id), "name": "Dompet", "type": "cash", "initial_balance": 100_000}
        ],
        "categories": [],
        "transactions": [
            {
                "id": str(uuid.uuid4()),
                "account_id": str(account_id),
                "amount": -30_000,
                "occurred_at": datetime(2024, 3, 1, 12, 0, 0, tzinfo=UTC).isoformat(),
                "source": "manual",
            },
            {
                "id": str(uuid.uuid4()),
                "account_id": str(account_id),
                "amount": 50_000,
                "occurred_at": datetime(2024, 3, 2, 9, 0, 0, tzinfo=UTC).isoformat(),
                "source": "manual",
            },
        ],
        "budget": None,
    }

    response = await client.post("/api/v1/sync/import", json=payload)
    assert response.status_code == 200

    detail = await client.get(f"/api/v1/accounts/{account_id}")
    assert detail.json()["data"]["balance"] == 120_000


async def test_reimport_does_not_double_apply_balance(client: AsyncClient) -> None:
    account_id = uuid.uuid4()
    payload = {
        "accounts": [
            {"id": str(account_id), "name": "Dompet", "type": "cash", "initial_balance": 100_000}
        ],
        "categories": [],
        "transactions": [
            {
                "id": str(uuid.uuid4()),
                "account_id": str(account_id),
                "amount": -30_000,
                "occurred_at": datetime(2024, 3, 1, 12, 0, 0, tzinfo=UTC).isoformat(),
                "source": "manual",
            }
        ],
        "budget": None,
    }

    await client.post("/api/v1/sync/import", json=payload)
    response = await client.post("/api/v1/sync/import", json=payload)
    assert response.status_code == 200

    detail = await client.get(f"/api/v1/accounts/{account_id}")
    assert detail.json()["data"]["balance"] == 70_000


async def test_import_does_not_touch_other_users_account_balance(
    client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    other_user_id = uuid.uuid4()
    other_account = await repo.create_account(
        db_session, other_user_id, name="Milik Orang Lain", type=AccountType.cash, currency="IDR"
    )
    await db_session.commit()

    payload = {
        "accounts": [],
        "categories": [],
        "transactions": [
            {
                "id": str(uuid.uuid4()),
                "account_id": str(other_account.id),
                "amount": 999_999,
                "occurred_at": datetime(2024, 3, 1, 12, 0, 0, tzinfo=UTC).isoformat(),
                "source": "manual",
            }
        ],
        "budget": None,
    }

    response = await client.post("/api/v1/sync/import", json=payload)

    assert response.json()["data"]["imported"]["transactions"] == 0
    refreshed = await repo.get_account(db_session, other_account.id)
    assert refreshed is not None
    assert refreshed.balance == 0


async def test_import_skips_transaction_with_nonexistent_account(client: AsyncClient) -> None:
    payload = {
        "accounts": [],
        "categories": [],
        "transactions": [
            {
                "id": str(uuid.uuid4()),
                "account_id": str(uuid.uuid4()),  # never imported, never exists
                "amount": -10_000,
                "occurred_at": datetime(2024, 3, 1, 12, 0, 0, tzinfo=UTC).isoformat(),
                "source": "manual",
            }
        ],
        "budget": None,
    }

    response = await client.post("/api/v1/sync/import", json=payload)

    # Must not 500 (FK violation) and must not insert the row.
    assert response.status_code == 200
    assert response.json()["data"]["imported"]["transactions"] == 0


async def test_import_skips_transaction_referencing_other_users_category(
    client: AsyncClient,
    db_session: AsyncSession,
    test_user_id: uuid.UUID,
) -> None:
    account = await repo.create_account(
        db_session, test_user_id, name="Dompet", type=AccountType.cash, currency="IDR"
    )
    other_user_id = uuid.uuid4()
    other_category = await repo.create_category(
        db_session, other_user_id, name="Rahasia", type=CategoryType.expense
    )
    await db_session.commit()

    payload = {
        "accounts": [],
        "categories": [],
        "transactions": [
            {
                "id": str(uuid.uuid4()),
                "account_id": str(account.id),
                "category_id": str(other_category.id),
                "amount": -10_000,
                "occurred_at": datetime(2024, 3, 1, 12, 0, 0, tzinfo=UTC).isoformat(),
                "source": "manual",
            }
        ],
        "budget": None,
    }

    response = await client.post("/api/v1/sync/import", json=payload)

    assert response.status_code == 200
    assert response.json()["data"]["imported"]["transactions"] == 0


async def test_import_allows_transaction_referencing_system_category(
    client: AsyncClient,
    db_session: AsyncSession,
    test_user_id: uuid.UUID,
) -> None:
    account = await repo.create_account(
        db_session, test_user_id, name="Dompet", type=AccountType.cash, currency="IDR"
    )
    system_category = await repo.create_category(
        db_session, None, name="Makanan", type=CategoryType.expense
    )
    await db_session.commit()

    payload = {
        "accounts": [],
        "categories": [],
        "transactions": [
            {
                "id": str(uuid.uuid4()),
                "account_id": str(account.id),
                "category_id": str(system_category.id),
                "amount": -10_000,
                "occurred_at": datetime(2024, 3, 1, 12, 0, 0, tzinfo=UTC).isoformat(),
                "source": "manual",
            }
        ],
        "budget": None,
    }

    response = await client.post("/api/v1/sync/import", json=payload)

    assert response.status_code == 200
    assert response.json()["data"]["imported"]["transactions"] == 1


async def test_import_rejects_payload_over_max_items(client: AsyncClient) -> None:
    payload = {
        "accounts": [
            {"id": str(uuid.uuid4()), "name": f"Acc {i}", "type": "cash"} for i in range(5001)
        ],
        "categories": [],
        "transactions": [],
        "budget": None,
    }

    response = await client.post("/api/v1/sync/import", json=payload)

    assert response.status_code == 422


async def test_import_rate_limited_after_10_requests(client: AsyncClient) -> None:
    fastapi_app.state.redis.pipeline.return_value.execute.return_value = [None, 11]

    payload = {"accounts": [], "categories": [], "transactions": [], "budget": None}
    response = await client.post("/api/v1/sync/import", json=payload)

    assert response.status_code == 429


async def test_import_accounts_and_transactions_together(client: AsyncClient) -> None:
    account_id = uuid.uuid4()
    tx_id = uuid.uuid4()
    payload = {
        "accounts": [{"id": str(account_id), "name": "Dompet", "type": "cash"}],
        "categories": [],
        "transactions": [
            {
                "id": str(tx_id),
                "account_id": str(account_id),
                "amount": -25000,
                "occurred_at": datetime(2024, 2, 1, 9, 0, 0, tzinfo=UTC).isoformat(),
                "source": "manual",
            }
        ],
        "budget": {"id": str(uuid.uuid4()), "monthly_limit": 3_000_000},
    }

    response = await client.post("/api/v1/sync/import", json=payload)

    assert response.status_code == 200
    data = response.json()["data"]["imported"]
    assert data["accounts"] == 1
    assert data["transactions"] == 1
    assert data["budgets"] == 1
