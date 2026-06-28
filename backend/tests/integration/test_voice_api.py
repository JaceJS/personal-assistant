"""Integration tests: voice upload/status endpoints."""

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


async def test_upload_voice_creates_log_and_enqueues_job(
    client: AsyncClient,
    db_session: AsyncSession,
    test_user_id: uuid.UUID,
) -> None:
    account = await repo.create_account(
        db_session,
        test_user_id,
        name="Wallet",
        type=AccountType.cash,
        currency="IDR",
    )
    await db_session.commit()

    storage = AsyncMock()
    redis = AsyncMock()
    redis.close = AsyncMock()

    with (
        patch("app.domains.finance.router.R2Storage", return_value=storage),
        patch("app.domains.finance.router.create_redis_pool", AsyncMock(return_value=redis)),
    ):
        response = await client.post(
            "/api/v1/voice/upload",
            data={"account_id": str(account.id)},
            files={"file": ("recording.m4a", b"audio", "audio/m4a")},
        )

    assert response.status_code == 201
    body = response.json()
    assert body["data"]["status"] == VoiceProcessingStatus.pending

    voice_log = await repo.get_voice_log(db_session, uuid.UUID(body["data"]["voice_log_id"]))
    assert voice_log is not None
    assert voice_log.user_id == test_user_id
    assert voice_log.audio_url.startswith(f"voice/{test_user_id}/")

    storage.upload.assert_awaited_once()
    redis.enqueue_job.assert_awaited_once_with(
        "process_voice",
        voice_log_id=str(voice_log.id),
        account_id=str(account.id),
    )
    redis.close.assert_awaited_once()


async def test_upload_voice_rejects_non_audio_file(
    client: AsyncClient,
    db_session: AsyncSession,
    test_user_id: uuid.UUID,
) -> None:
    account = await repo.create_account(
        db_session,
        test_user_id,
        name="Wallet",
        type=AccountType.cash,
        currency="IDR",
    )
    await db_session.commit()

    redis = AsyncMock()
    redis.close = AsyncMock()

    with patch("app.domains.finance.router.create_redis_pool", AsyncMock(return_value=redis)):
        response = await client.post(
            "/api/v1/voice/upload",
            data={"account_id": str(account.id)},
            files={"file": ("note.txt", b"not audio", "text/plain")},
        )

    assert response.status_code == 400
    redis.enqueue_job.assert_not_called()


async def test_get_voice_status_returns_404_for_missing_log(client: AsyncClient) -> None:
    response = await client.get(f"/api/v1/voice/{uuid.uuid4()}")

    assert response.status_code == 404


async def test_get_voice_status_forbidden_for_other_users_log(
    client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    voice_log = await repo.create_voice_log(
        db_session, uuid.uuid4(), audio_url="voice/other/recording.m4a"
    )
    await db_session.commit()

    response = await client.get(f"/api/v1/voice/{voice_log.id}")

    assert response.status_code == 403


async def test_get_voice_status_returns_completed_transaction(
    client: AsyncClient,
    db_session: AsyncSession,
    test_user_id: uuid.UUID,
) -> None:
    account = await repo.create_account(
        db_session,
        test_user_id,
        name="Wallet",
        type=AccountType.cash,
        currency="IDR",
    )
    voice_log = await repo.create_voice_log(
        db_session, test_user_id, audio_url="voice/user/recording.m4a"
    )
    await repo.update_voice_log_status(
        db_session,
        voice_log,
        VoiceProcessingStatus.completed,
        transcript="beli makan gocap di warung",
        extracted_data={
            "amount": -50_000,
            "currency": "IDR",
            "merchant": "Warung",
            "category_name": "Food",
            "note": None,
            "confidence": 0.9,
        },
        confidence_score=0.9,
    )
    tx = await repo.create_transaction(
        db_session,
        test_user_id,
        account_id=account.id,
        amount=-50_000,
        currency="IDR",
        merchant="Warung",
        occurred_at=voice_log.created_at,
        source=TransactionSource.voice,
        status=TransactionStatus.draft,
        voice_log_id=voice_log.id,
    )
    await db_session.commit()

    response = await client.get(f"/api/v1/voice/{voice_log.id}")

    assert response.status_code == 200
    body = response.json()["data"]
    assert body["status"] == VoiceProcessingStatus.completed
    assert body["transaction_id"] == str(tx.id)
    assert body["extracted_data"]["amount"] == -50_000
