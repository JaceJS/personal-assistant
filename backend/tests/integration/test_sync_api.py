"""Integration tests: sync/import endpoint."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.finance import repository as repo
from app.domains.finance.models import AccountType

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


async def test_import_upserts_budget(client: AsyncClient) -> None:
    payload = {
        "accounts": [],
        "categories": [],
        "transactions": [],
        "budget": {"id": str(uuid.uuid4()), "monthly_limit": 5_000_000},
    }

    response = await client.post("/api/v1/sync/import", json=payload)

    assert response.status_code == 200
    assert response.json()["data"]["imported"]["budgets"] == 1


async def test_import_handles_empty_payload(client: AsyncClient) -> None:
    payload = {"accounts": [], "categories": [], "transactions": [], "budget": None}

    response = await client.post("/api/v1/sync/import", json=payload)

    assert response.status_code == 200
    data = response.json()["data"]["imported"]
    assert data == {"accounts": 0, "categories": 0, "transactions": 0, "budgets": 0}


async def test_import_requires_auth() -> None:
    from app.main import app

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post(
            "/api/v1/sync/import",
            json={"accounts": [], "categories": [], "transactions": [], "budget": None},
        )

    assert response.status_code == 401


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
