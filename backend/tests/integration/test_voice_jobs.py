"""Integration tests: voice background job pipeline (STT + LLM are mocked)."""

from __future__ import annotations

import uuid
from unittest.mock import AsyncMock, patch

import pytest
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker

from app.domains.finance import repository as repo
from app.domains.finance.extractor import ExtractedTransaction, ExtractedTransactionList
from app.domains.finance.jobs import _GENERIC_FAILURE_MESSAGE, extract_voice, process_voice
from app.domains.finance.models import AccountType, TransactionStatus, VoiceProcessingStatus

pytestmark = pytest.mark.integration


async def test_process_voice_creates_draft_transaction(
    db_engine: AsyncEngine,
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
        db_session, test_user_id, audio_url="recordings/test.webm"
    )
    await db_session.commit()

    mock_stt = AsyncMock()
    mock_stt.transcribe = AsyncMock(return_value="beli makan gocap di warung")
    mock_llm = AsyncMock()
    mock_llm.extract = AsyncMock(
        return_value=ExtractedTransactionList(
            transactions=[
                ExtractedTransaction(
                    amount=-50_000, currency="IDR", merchant="Warung", confidence=0.9
                )
            ]
        )
    )
    mock_r2 = AsyncMock()
    mock_r2.download = AsyncMock(return_value=b"fake-audio")

    test_factory = async_sessionmaker(db_engine, expire_on_commit=False)

    with patch("app.domains.finance.jobs.SessionFactory", test_factory):
        await process_voice(
            stt=mock_stt,
            r2=mock_r2,
            voice_log_id=str(voice_log.id),
            account_id=str(account.id),
        )
        await extract_voice(
            llm=mock_llm,
            voice_log_id=str(voice_log.id),
            account_id=str(account.id),
            transcript="beli makan gocap di warung",
        )

    await db_session.refresh(voice_log)
    assert voice_log.processing_status == VoiceProcessingStatus.completed
    assert voice_log.transcript == "beli makan gocap di warung"

    txs = await repo.list_transactions(db_session, test_user_id)
    assert len(txs) == 1
    assert txs[0].amount == -50_000
    assert txs[0].status == TransactionStatus.draft
    assert txs[0].merchant == "Warung"
    assert txs[0].voice_log_id == voice_log.id


async def test_process_voice_creates_multiple_draft_transactions(
    db_engine: AsyncEngine,
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
        db_session, test_user_id, audio_url="recordings/test.webm"
    )
    await db_session.commit()

    transcript = "beli kopi 15rb sama parkir 5rb"
    mock_stt = AsyncMock()
    mock_stt.transcribe = AsyncMock(return_value=transcript)
    mock_llm = AsyncMock()
    mock_llm.extract = AsyncMock(
        return_value=ExtractedTransactionList(
            transactions=[
                ExtractedTransaction(
                    amount=-15_000, currency="IDR", merchant="Kopi", confidence=0.9
                ),
                ExtractedTransaction(
                    amount=-5_000, currency="IDR", merchant="Parkir", confidence=0.85
                ),
            ]
        )
    )
    mock_r2 = AsyncMock()
    mock_r2.download = AsyncMock(return_value=b"fake-audio")

    test_factory = async_sessionmaker(db_engine, expire_on_commit=False)

    with patch("app.domains.finance.jobs.SessionFactory", test_factory):
        await process_voice(
            stt=mock_stt, r2=mock_r2, voice_log_id=str(voice_log.id), account_id=str(account.id)
        )
        await extract_voice(
            llm=mock_llm,
            voice_log_id=str(voice_log.id),
            account_id=str(account.id),
            transcript=transcript,
        )

    txs = await repo.list_transactions(db_session, test_user_id)
    assert len(txs) == 2
    amounts = sorted(tx.amount for tx in txs)
    assert amounts == [-15_000, -5_000]
    assert all(tx.voice_log_id == voice_log.id for tx in txs)
    assert all(tx.status == TransactionStatus.draft for tx in txs)


async def test_process_voice_does_not_overwrite_a_self_healed_failure(
    db_engine: AsyncEngine,
    db_session: AsyncSession,
    test_user_id: uuid.UUID,
) -> None:
    voice_log = await repo.create_voice_log(
        db_session, test_user_id, audio_url="recordings/test.webm"
    )
    await db_session.commit()

    mock_stt = AsyncMock()
    mock_stt.transcribe = AsyncMock(return_value="beli makan gocap di warung")
    mock_r2 = AsyncMock()
    mock_r2.download = AsyncMock(return_value=b"fake-audio")

    test_factory = async_sessionmaker(db_engine, expire_on_commit=False)

    with patch("app.domains.finance.jobs.SessionFactory", test_factory), patch(
        "app.domains.finance.repository.update_voice_log_status_if",
        AsyncMock(return_value=False),
    ):
        await process_voice(
            stt=mock_stt, r2=mock_r2, voice_log_id=str(voice_log.id), account_id=""
        )

    await db_session.refresh(voice_log)
    assert voice_log.processing_status != VoiceProcessingStatus.transcribed
    assert voice_log.transcript is None


async def test_process_voice_stores_generic_error_not_raw_exception_text(
    db_engine: AsyncEngine,
    db_session: AsyncSession,
    test_user_id: uuid.UUID,
) -> None:
    voice_log = await repo.create_voice_log(
        db_session, test_user_id, audio_url="recordings/test.webm"
    )
    await db_session.commit()

    mock_stt = AsyncMock()
    mock_stt.transcribe = AsyncMock(
        side_effect=RuntimeError("connection to internal-stt-host:5000 refused")
    )
    mock_r2 = AsyncMock()
    mock_r2.download = AsyncMock(return_value=b"fake-audio")

    test_factory = async_sessionmaker(db_engine, expire_on_commit=False)

    with patch("app.domains.finance.jobs.SessionFactory", test_factory):
        await process_voice(
            stt=mock_stt, r2=mock_r2, voice_log_id=str(voice_log.id), account_id=""
        )

    await db_session.refresh(voice_log)
    assert voice_log.processing_status == VoiceProcessingStatus.failed
    assert voice_log.error_message == _GENERIC_FAILURE_MESSAGE
    assert "internal-stt-host" not in (voice_log.error_message or "")


async def test_process_voice_marks_failed_when_initial_fetch_raises(
    db_engine: AsyncEngine,
    db_session: AsyncSession,
    test_user_id: uuid.UUID,
) -> None:
    voice_log = await repo.create_voice_log(
        db_session, test_user_id, audio_url="recordings/test.webm"
    )
    await db_session.commit()

    mock_stt = AsyncMock()
    mock_r2 = AsyncMock()
    test_factory = async_sessionmaker(db_engine, expire_on_commit=False)
    real_get_voice_log = repo.get_voice_log
    call_count = 0

    async def flaky_get_voice_log(session: AsyncSession, log_id: uuid.UUID) -> object:
        nonlocal call_count
        call_count += 1
        if call_count == 1:
            raise RuntimeError("db connection dropped")
        return await real_get_voice_log(session, log_id)

    with (
        patch("app.domains.finance.jobs.SessionFactory", test_factory),
        patch("app.domains.finance.jobs.repo.get_voice_log", side_effect=flaky_get_voice_log),
    ):
        await process_voice(
            stt=mock_stt, r2=mock_r2, voice_log_id=str(voice_log.id), account_id=""
        )

    await db_session.refresh(voice_log)
    assert voice_log.processing_status == VoiceProcessingStatus.failed
    mock_r2.delete.assert_not_called()


async def test_extract_voice_does_not_overwrite_a_self_healed_failure(
    db_engine: AsyncEngine,
    db_session: AsyncSession,
    test_user_id: uuid.UUID,
) -> None:
    account = await repo.create_account(
        db_session, test_user_id, name="Wallet", type=AccountType.cash, currency="IDR"
    )
    voice_log = await repo.create_voice_log(
        db_session, test_user_id, audio_url="recordings/test.webm"
    )
    await db_session.commit()

    mock_llm = AsyncMock()
    mock_llm.extract = AsyncMock(
        return_value=ExtractedTransactionList(
            transactions=[ExtractedTransaction(amount=-50_000, confidence=0.9)]
        )
    )

    test_factory = async_sessionmaker(db_engine, expire_on_commit=False)

    with patch("app.domains.finance.jobs.SessionFactory", test_factory), patch(
        "app.domains.finance.repository.update_voice_log_status_if",
        AsyncMock(return_value=False),
    ):
        await extract_voice(
            llm=mock_llm,
            voice_log_id=str(voice_log.id),
            account_id=str(account.id),
            transcript="beli makan gocap di warung",
        )

    txs = await repo.list_transactions(db_session, test_user_id)
    assert len(txs) == 0
