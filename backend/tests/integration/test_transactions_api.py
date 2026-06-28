"""Integration tests: transaction endpoints + account balance update."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.finance import repository as repo
from app.domains.finance.models import AccountType, TransactionSource, TransactionStatus

pytestmark = pytest.mark.integration


async def test_create_transaction_updates_account_balance(
    client: AsyncClient,
    db_session: AsyncSession,
    test_user_id: uuid.UUID,
) -> None:
    account = await repo.create_account(
        db_session,
        test_user_id,
        name="Dompet",
        type=AccountType.cash,
        currency="IDR",
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
        db_session,
        other_user,
        name="Other",
        type=AccountType.bank,
        currency="IDR",
    )
    await db_session.commit()

    payload = {
        "account_id": str(account.id),
        "amount": -10_000,
        "occurred_at": datetime.now(UTC).isoformat(),
    }
    response = await client.post("/api/v1/transactions", json=payload)

    assert response.status_code == 403


async def test_get_transaction_returns_detail(
    client: AsyncClient,
    db_session: AsyncSession,
    test_user_id: uuid.UUID,
) -> None:
    account = await repo.create_account(
        db_session,
        test_user_id,
        name="Dompet",
        type=AccountType.cash,
        currency="IDR",
    )
    tx = await repo.create_transaction(
        db_session,
        test_user_id,
        account_id=account.id,
        amount=-25_000,
        currency="IDR",
        occurred_at=datetime.now(UTC),
        source=TransactionSource.manual,
        status=TransactionStatus.confirmed,
    )
    await db_session.commit()

    response = await client.get(f"/api/v1/transactions/{tx.id}")

    assert response.status_code == 200
    assert response.json()["data"]["id"] == str(tx.id)


async def test_get_transaction_forbidden_for_other_users_transaction(
    client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    other_user = uuid.uuid4()
    account = await repo.create_account(
        db_session,
        other_user,
        name="Other",
        type=AccountType.bank,
        currency="IDR",
    )
    tx = await repo.create_transaction(
        db_session,
        other_user,
        account_id=account.id,
        amount=-10_000,
        currency="IDR",
        occurred_at=datetime.now(UTC),
        source=TransactionSource.manual,
        status=TransactionStatus.confirmed,
    )
    await db_session.commit()

    response = await client.get(f"/api/v1/transactions/{tx.id}")

    assert response.status_code == 403


async def test_get_transaction_not_found(client: AsyncClient) -> None:
    response = await client.get(f"/api/v1/transactions/{uuid.uuid4()}")

    assert response.status_code == 404


async def test_create_account_with_initial_balance_and_transaction(
    client: AsyncClient,
    db_session: AsyncSession,
    test_user_id: uuid.UUID,
) -> None:
    # 1. Create account with initial balance
    account_payload = {
        "name": "BCA Rekening",
        "type": "bank",
        "initial_balance": 1_000_000,
    }
    acc_response = await client.post("/api/v1/accounts", json=account_payload)
    assert acc_response.status_code == 201
    account_id = acc_response.json()["data"]["id"]
    assert acc_response.json()["data"]["initial_balance"] == 1_000_000
    assert acc_response.json()["data"]["balance"] == 1_000_000

    # 2. Add transaction of -250,000
    tx_payload = {
        "account_id": account_id,
        "amount": -250_000,
        "currency": "IDR",
        "occurred_at": datetime.now(UTC).isoformat(),
    }
    tx_response = await client.post("/api/v1/transactions", json=tx_payload)
    assert tx_response.status_code == 201

    # 3. Retrieve account and check that its balance is now 750,000
    acc_check = await client.get(f"/api/v1/accounts/{account_id}")
    assert acc_check.status_code == 200
    assert acc_check.json()["data"]["balance"] == 750_000
