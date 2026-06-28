"""Integration tests: voice worker pipeline (STT + LLM are mocked)."""

from __future__ import annotations

import uuid
from unittest.mock import AsyncMock, patch

import pytest
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker

from app.domains.finance import repository as repo
from app.domains.finance.extractor import ExtractedTransaction
from app.domains.finance.models import AccountType, TransactionStatus, VoiceProcessingStatus
from app.workers.voice_processor import process_voice

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
        return_value=ExtractedTransaction(
            amount=-50_000, currency="IDR", merchant="Warung", confidence=0.9
        )
    )
    mock_r2 = AsyncMock()
    mock_r2.download = AsyncMock(return_value=b"fake-audio")

    ctx: dict[str, object] = {"stt": mock_stt, "llm": mock_llm, "r2": mock_r2}
    test_factory = async_sessionmaker(db_engine, expire_on_commit=False)

    with patch("app.workers.voice_processor.SessionFactory", test_factory):
        await process_voice(
            ctx,
            voice_log_id=str(voice_log.id),
            account_id=str(account.id),
        )
        from app.workers.voice_processor import extract_voice
        await extract_voice(
            ctx,
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
