"""Integration tests: transaction endpoints + account balance update."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.finance import repository as repo
from app.domains.finance.models import AccountType

pytestmark = pytest.mark.integration


async def test_create_transaction_updates_account_balance(
    client: AsyncClient,
    db_session: AsyncSession,
    test_user_id: uuid.UUID,
) -> None:
    account = await repo.create_account(
        db_session, test_user_id,
        name="Dompet", type=AccountType.cash, currency="IDR",
    )
    await db_session.commit()

    payload = {
        "account_id": str(account.id),
        "amount": -50_000,
        "currency": "IDR",
        "occurred_at": datetime.now(UTC).isoformat(),
    }
    response = await client.post("/api/v1/transactions", json=payload)

    assert response.status_code == 201
    assert response.json()["data"]["amount"] == -50_000

    await db_session.refresh(account)
    assert account.balance == -50_000


async def test_create_transaction_forbidden_for_other_users_account(
    client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    other_user = uuid.uuid4()
    account = await repo.create_account(
        db_session, other_user,
        name="Other", type=AccountType.bank, currency="IDR",
    )
    await db_session.commit()

    payload = {
        "account_id": str(account.id),
        "amount": -10_000,
        "occurred_at": datetime.now(UTC).isoformat(),
    }
    response = await client.post("/api/v1/transactions", json=payload)

    assert response.status_code == 403
