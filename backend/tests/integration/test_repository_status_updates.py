"""Atomic conditional status updates: guard against lost-update races.

A plain read-then-write (load ORM object, check status in Python, write) lets two
concurrent requests/jobs both pass the check before either commits. These helpers
do the check in the UPDATE's WHERE clause instead, so only one writer ever wins.
"""

from __future__ import annotations

import uuid

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.finance import repository as repo
from app.domains.finance.models import AccountType, VoiceProcessingStatus

pytestmark = pytest.mark.integration


async def test_update_voice_log_status_if_succeeds_when_status_matches(
    db_session: AsyncSession,
    test_user_id: uuid.UUID,
) -> None:
    voice_log = await repo.create_voice_log(db_session, test_user_id, "voice/test.m4a")
    await db_session.commit()

    updated = await repo.update_voice_log_status_if(
        db_session,
        voice_log.id,
        expected_statuses=[VoiceProcessingStatus.pending],
        status=VoiceProcessingStatus.transcribing,
    )

    assert updated is True
    refreshed = await repo.get_voice_log(db_session, voice_log.id)
    assert refreshed is not None
    assert refreshed.processing_status == VoiceProcessingStatus.transcribing


async def test_update_voice_log_status_if_returns_false_when_status_already_changed(
    db_session: AsyncSession,
    test_user_id: uuid.UUID,
) -> None:
    voice_log = await repo.create_voice_log(db_session, test_user_id, "voice/test.m4a")
    await db_session.commit()

    # Simulate a concurrent writer that already moved the row past "pending".
    await repo.update_voice_log_status_if(
        db_session,
        voice_log.id,
        expected_statuses=[VoiceProcessingStatus.pending],
        status=VoiceProcessingStatus.failed,
    )

    updated = await repo.update_voice_log_status_if(
        db_session,
        voice_log.id,
        expected_statuses=[VoiceProcessingStatus.pending],
        status=VoiceProcessingStatus.transcribing,
    )

    assert updated is False
    refreshed = await repo.get_voice_log(db_session, voice_log.id)
    assert refreshed is not None
    assert refreshed.processing_status == VoiceProcessingStatus.failed


async def test_update_receipt_log_status_if_succeeds_when_status_matches(
    db_session: AsyncSession,
    test_user_id: uuid.UUID,
) -> None:
    account = await repo.create_account(
        db_session, test_user_id, name="Wallet", type=AccountType.cash, currency="IDR"
    )
    receipt_log = await repo.create_receipt_log(
        db_session, test_user_id, account_id=account.id, image_url="receipt/test.jpg"
    )
    await db_session.commit()

    updated = await repo.update_receipt_log_status_if(
        db_session,
        receipt_log.id,
        expected_statuses=[VoiceProcessingStatus.pending],
        status=VoiceProcessingStatus.extracting,
    )

    assert updated is True
    refreshed = await repo.get_receipt_log(db_session, receipt_log.id)
    assert refreshed is not None
    assert refreshed.processing_status == VoiceProcessingStatus.extracting


async def test_update_receipt_log_status_if_returns_false_when_status_already_changed(
    db_session: AsyncSession,
    test_user_id: uuid.UUID,
) -> None:
    account = await repo.create_account(
        db_session, test_user_id, name="Wallet", type=AccountType.cash, currency="IDR"
    )
    receipt_log = await repo.create_receipt_log(
        db_session, test_user_id, account_id=account.id, image_url="receipt/test.jpg"
    )
    await db_session.commit()

    await repo.update_receipt_log_status_if(
        db_session,
        receipt_log.id,
        expected_statuses=[VoiceProcessingStatus.pending],
        status=VoiceProcessingStatus.failed,
    )

    updated = await repo.update_receipt_log_status_if(
        db_session,
        receipt_log.id,
        expected_statuses=[VoiceProcessingStatus.pending],
        status=VoiceProcessingStatus.extracting,
    )

    assert updated is False
    refreshed = await repo.get_receipt_log(db_session, receipt_log.id)
    assert refreshed is not None
    assert refreshed.processing_status == VoiceProcessingStatus.failed
