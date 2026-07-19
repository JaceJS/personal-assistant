"""Integration tests: receipt upload/status endpoints."""

from __future__ import annotations

import uuid
from unittest.mock import AsyncMock, patch

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.finance import repository as repo
from app.domains.finance.models import (
    AccountType,
    TransactionSource,
    TransactionStatus,
    VoiceProcessingStatus,
)

pytestmark = pytest.mark.integration


async def test_upload_receipt_creates_log_and_enqueues_job(
    client: AsyncClient,
    db_session: AsyncSession,
    test_user_id: uuid.UUID,
) -> None:
    account = await repo.create_account(
        db_session, test_user_id, name="Wallet", type=AccountType.cash, currency="IDR"
    )
    await db_session.commit()

    storage = AsyncMock()
    mock_process_receipt = AsyncMock()

    with (
        patch("app.domains.finance.routers.receipt.R2Storage", return_value=storage),
        patch("app.domains.finance.jobs.process_receipt", mock_process_receipt),
        patch("app.core.upload_utils.filetype.guess") as mock_guess,
    ):
        mock_guess.return_value.mime = "image/jpeg"
        response = await client.post(
            "/api/v1/receipt/upload",
            data={"account_id": str(account.id)},
            files={"file": ("receipt.jpg", b"image", "image/jpeg")},
        )

    assert response.status_code == 201
    body = response.json()["data"]
    assert body["status"] == VoiceProcessingStatus.pending

    receipt_log = await repo.get_receipt_log(db_session, uuid.UUID(body["receipt_log_id"]))
    assert receipt_log is not None
    assert receipt_log.user_id == test_user_id

    storage.upload.assert_awaited_once()
    mock_process_receipt.assert_awaited_once()
    call_kwargs = mock_process_receipt.await_args.kwargs
    assert call_kwargs["receipt_log_id"] == str(receipt_log.id)
    assert call_kwargs["account_id"] == str(account.id)
    assert call_kwargs["r2"] is storage


async def test_get_receipt_status_returns_404_for_missing_log(client: AsyncClient) -> None:
    response = await client.get(f"/api/v1/receipt/{uuid.uuid4()}")

    assert response.status_code == 404


async def test_get_receipt_status_forbidden_for_other_users_log(
    client: AsyncClient,
    db_session: AsyncSession,
    test_user_id: uuid.UUID,
) -> None:
    other_account = await repo.create_account(
        db_session, uuid.uuid4(), name="Other", type=AccountType.cash, currency="IDR"
    )
    receipt_log = await repo.create_receipt_log(
        db_session,
        uuid.uuid4(),
        account_id=other_account.id,
        image_url="receipt/other.jpg",
    )
    await db_session.commit()

    response = await client.get(f"/api/v1/receipt/{receipt_log.id}")

    assert response.status_code == 403


async def test_get_receipt_status_returns_multiple_transactions(
    client: AsyncClient,
    db_session: AsyncSession,
    test_user_id: uuid.UUID,
) -> None:
    account = await repo.create_account(
        db_session, test_user_id, name="Wallet", type=AccountType.cash, currency="IDR"
    )
    receipt_log = await repo.create_receipt_log(
        db_session, test_user_id, account_id=account.id, image_url="receipt/mixed.jpg"
    )
    extracted = [
        {
            "amount": -80_000,
            "currency": "IDR",
            "merchant": None,
            "category_name": "Groceries",
            "note": None,
            "confidence": 0.9,
        },
        {
            "amount": -40_000,
            "currency": "IDR",
            "merchant": None,
            "category_name": "Kesehatan",
            "note": None,
            "confidence": 0.85,
        },
    ]
    await repo.update_receipt_log_status(
        db_session,
        receipt_log,
        VoiceProcessingStatus.completed,
        extracted_data=extracted,
    )
    tx1 = await repo.create_transaction(
        db_session,
        test_user_id,
        account_id=account.id,
        amount=-80_000,
        currency="IDR",
        occurred_at=receipt_log.created_at,
        source=TransactionSource.receipt,
        status=TransactionStatus.draft,
        receipt_log_id=receipt_log.id,
    )
    tx2 = await repo.create_transaction(
        db_session,
        test_user_id,
        account_id=account.id,
        amount=-40_000,
        currency="IDR",
        occurred_at=receipt_log.created_at,
        source=TransactionSource.receipt,
        status=TransactionStatus.draft,
        receipt_log_id=receipt_log.id,
    )
    await db_session.commit()

    response = await client.get(f"/api/v1/receipt/{receipt_log.id}")

    assert response.status_code == 200
    body = response.json()["data"]
    assert body["status"] == VoiceProcessingStatus.completed
    assert set(body["transaction_ids"]) == {str(tx1.id), str(tx2.id)}
    assert len(body["extracted_data"]) == 2
