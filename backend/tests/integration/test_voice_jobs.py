"""Integration tests: voice background job pipeline (STT + LLM are mocked)."""

from __future__ import annotations

import uuid
from unittest.mock import AsyncMock, patch

import pytest
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker

from app.domains.finance import repository as repo
from app.domains.finance.extractor import ExtractedTransaction, ExtractedTransactionList
from app.domains.finance.jobs import extract_voice, process_voice
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
