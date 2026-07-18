"""Integration tests: receipt worker pipeline (vision LLM is mocked)."""

from __future__ import annotations

import uuid
from unittest.mock import AsyncMock, patch

import pytest
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker

from app.domains.finance import repository as repo
from app.domains.finance.extractor import ExtractedTransaction, ExtractedTransactionList
from app.domains.finance.models import AccountType, TransactionStatus, VoiceProcessingStatus
from app.workers.voice_processor import process_receipt

pytestmark = pytest.mark.integration


async def test_process_receipt_creates_draft_transaction(
    db_engine: AsyncEngine,
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

    mock_llm = AsyncMock()
    mock_llm.extract_from_image = AsyncMock(
        return_value=ExtractedTransactionList(
            transactions=[
                ExtractedTransaction(
                    amount=-120_000, currency="IDR", merchant="Indomaret", confidence=0.9
                )
            ]
        )
    )
    mock_r2 = AsyncMock()
    mock_r2.download = AsyncMock(return_value=b"fake-image")

    ctx: dict[str, object] = {"vision_llm": mock_llm, "r2": mock_r2}
    test_factory = async_sessionmaker(db_engine, expire_on_commit=False)

    with patch("app.workers.voice_processor.SessionFactory", test_factory):
        await process_receipt(
            ctx, receipt_log_id=str(receipt_log.id), account_id=str(account.id)
        )

    await db_session.refresh(receipt_log)
    assert receipt_log.processing_status == VoiceProcessingStatus.completed

    txs = await repo.list_transactions(db_session, test_user_id)
    assert len(txs) == 1
    assert txs[0].amount == -120_000
    assert txs[0].merchant == "Indomaret"
    assert txs[0].status == TransactionStatus.draft
    assert txs[0].receipt_log_id == receipt_log.id


async def test_process_receipt_creates_multiple_draft_transactions(
    db_engine: AsyncEngine,
    db_session: AsyncSession,
    test_user_id: uuid.UUID,
) -> None:
    account = await repo.create_account(
        db_session, test_user_id, name="Wallet", type=AccountType.cash, currency="IDR"
    )
    receipt_log = await repo.create_receipt_log(
        db_session, test_user_id, account_id=account.id, image_url="receipt/mixed.jpg"
    )
    await db_session.commit()

    mock_llm = AsyncMock()
    mock_llm.extract_from_image = AsyncMock(
        return_value=ExtractedTransactionList(
            transactions=[
                ExtractedTransaction(
                    amount=-80_000, category_name="Groceries", confidence=0.9
                ),
                ExtractedTransaction(
                    amount=-40_000, category_name="Kesehatan", confidence=0.85
                ),
            ]
        )
    )
    mock_r2 = AsyncMock()
    mock_r2.download = AsyncMock(return_value=b"fake-image")

    ctx: dict[str, object] = {"vision_llm": mock_llm, "r2": mock_r2}
    test_factory = async_sessionmaker(db_engine, expire_on_commit=False)

    with patch("app.workers.voice_processor.SessionFactory", test_factory):
        await process_receipt(
            ctx, receipt_log_id=str(receipt_log.id), account_id=str(account.id)
        )

    txs = await repo.list_transactions(db_session, test_user_id)
    assert len(txs) == 2
    amounts = sorted(tx.amount for tx in txs)
    assert amounts == [-80_000, -40_000]
    assert all(tx.receipt_log_id == receipt_log.id for tx in txs)


async def test_process_receipt_marks_failed_when_no_confident_transaction(
    db_engine: AsyncEngine,
    db_session: AsyncSession,
    test_user_id: uuid.UUID,
) -> None:
    account = await repo.create_account(
        db_session, test_user_id, name="Wallet", type=AccountType.cash, currency="IDR"
    )
    receipt_log = await repo.create_receipt_log(
        db_session, test_user_id, account_id=account.id, image_url="receipt/blurry.jpg"
    )
    await db_session.commit()

    mock_llm = AsyncMock()
    mock_llm.extract_from_image = AsyncMock(
        return_value=ExtractedTransactionList(
            transactions=[ExtractedTransaction(amount=-1_000, confidence=0.05)]
        )
    )
    mock_r2 = AsyncMock()
    mock_r2.download = AsyncMock(return_value=b"blurry-image")

    ctx: dict[str, object] = {"vision_llm": mock_llm, "r2": mock_r2}
    test_factory = async_sessionmaker(db_engine, expire_on_commit=False)

    with patch("app.workers.voice_processor.SessionFactory", test_factory):
        await process_receipt(
            ctx, receipt_log_id=str(receipt_log.id), account_id=str(account.id)
        )

    await db_session.refresh(receipt_log)
    assert receipt_log.processing_status == VoiceProcessingStatus.failed

    txs = await repo.list_transactions(db_session, test_user_id)
    assert len(txs) == 0
