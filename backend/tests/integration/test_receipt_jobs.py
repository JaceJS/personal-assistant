"""Integration tests: receipt background job pipeline (vision LLM is mocked)."""

from __future__ import annotations

import uuid
from unittest.mock import AsyncMock, patch

import pytest
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker

from app.domains.finance import repository as repo
from app.domains.finance.extractor import ExtractedTransaction, ExtractedTransactionList
from app.domains.finance.jobs import _GENERIC_FAILURE_MESSAGE, process_receipt
from app.domains.finance.models import AccountType, TransactionStatus, VoiceProcessingStatus

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

    test_factory = async_sessionmaker(db_engine, expire_on_commit=False)

    with patch("app.domains.finance.jobs.SessionFactory", test_factory):
        await process_receipt(
            vision_llm=mock_llm,
            r2=mock_r2,
            receipt_log_id=str(receipt_log.id),
            account_id=str(account.id),
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

    test_factory = async_sessionmaker(db_engine, expire_on_commit=False)

    with patch("app.domains.finance.jobs.SessionFactory", test_factory):
        await process_receipt(
            vision_llm=mock_llm,
            r2=mock_r2,
            receipt_log_id=str(receipt_log.id),
            account_id=str(account.id),
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

    test_factory = async_sessionmaker(db_engine, expire_on_commit=False)

    with patch("app.domains.finance.jobs.SessionFactory", test_factory):
        await process_receipt(
            vision_llm=mock_llm,
            r2=mock_r2,
            receipt_log_id=str(receipt_log.id),
            account_id=str(account.id),
        )

    await db_session.refresh(receipt_log)
    assert receipt_log.processing_status == VoiceProcessingStatus.failed

    txs = await repo.list_transactions(db_session, test_user_id)
    assert len(txs) == 0


async def test_process_receipt_uses_correct_mime_for_jpeg(
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
            transactions=[ExtractedTransaction(amount=-1_000, confidence=0.9)]
        )
    )
    mock_r2 = AsyncMock()
    mock_r2.download = AsyncMock(return_value=b"fake-image")

    test_factory = async_sessionmaker(db_engine, expire_on_commit=False)

    with patch("app.domains.finance.jobs.SessionFactory", test_factory):
        await process_receipt(
            vision_llm=mock_llm,
            r2=mock_r2,
            receipt_log_id=str(receipt_log.id),
            account_id=str(account.id),
        )

    assert mock_llm.extract_from_image.call_args.kwargs["image_media_type"] == "image/jpeg"


async def test_process_receipt_uses_correct_mime_for_png(
    db_engine: AsyncEngine,
    db_session: AsyncSession,
    test_user_id: uuid.UUID,
) -> None:
    account = await repo.create_account(
        db_session, test_user_id, name="Wallet", type=AccountType.cash, currency="IDR"
    )
    receipt_log = await repo.create_receipt_log(
        db_session, test_user_id, account_id=account.id, image_url="receipt/test.png"
    )
    await db_session.commit()

    mock_llm = AsyncMock()
    mock_llm.extract_from_image = AsyncMock(
        return_value=ExtractedTransactionList(
            transactions=[ExtractedTransaction(amount=-1_000, confidence=0.9)]
        )
    )
    mock_r2 = AsyncMock()
    mock_r2.download = AsyncMock(return_value=b"fake-image")

    test_factory = async_sessionmaker(db_engine, expire_on_commit=False)

    with patch("app.domains.finance.jobs.SessionFactory", test_factory):
        await process_receipt(
            vision_llm=mock_llm,
            r2=mock_r2,
            receipt_log_id=str(receipt_log.id),
            account_id=str(account.id),
        )

    assert mock_llm.extract_from_image.call_args.kwargs["image_media_type"] == "image/png"


async def test_process_receipt_stores_generic_error_not_raw_exception_text(
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
        side_effect=RuntimeError("connection to internal-vision-host:5000 refused")
    )
    mock_r2 = AsyncMock()
    mock_r2.download = AsyncMock(return_value=b"fake-image")

    test_factory = async_sessionmaker(db_engine, expire_on_commit=False)

    with patch("app.domains.finance.jobs.SessionFactory", test_factory):
        await process_receipt(
            vision_llm=mock_llm,
            r2=mock_r2,
            receipt_log_id=str(receipt_log.id),
            account_id=str(account.id),
        )

    await db_session.refresh(receipt_log)
    assert receipt_log.processing_status == VoiceProcessingStatus.failed
    assert receipt_log.error_message == _GENERIC_FAILURE_MESSAGE
    assert "internal-vision-host" not in (receipt_log.error_message or "")


async def test_process_receipt_marks_failed_when_initial_fetch_raises(
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
    mock_r2 = AsyncMock()
    test_factory = async_sessionmaker(db_engine, expire_on_commit=False)
    real_get_receipt_log = repo.get_receipt_log
    call_count = 0

    async def flaky_get_receipt_log(session: AsyncSession, log_id: uuid.UUID) -> object:
        nonlocal call_count
        call_count += 1
        if call_count == 1:
            raise RuntimeError("db connection dropped")
        return await real_get_receipt_log(session, log_id)

    with (
        patch("app.domains.finance.jobs.SessionFactory", test_factory),
        patch(
            "app.domains.finance.jobs.repo.get_receipt_log", side_effect=flaky_get_receipt_log
        ),
    ):
        await process_receipt(
            vision_llm=mock_llm,
            r2=mock_r2,
            receipt_log_id=str(receipt_log.id),
            account_id=str(account.id),
        )

    await db_session.refresh(receipt_log)
    assert receipt_log.processing_status == VoiceProcessingStatus.failed
    mock_r2.delete.assert_not_called()


async def test_process_receipt_does_not_overwrite_a_self_healed_failure(
    db_engine: AsyncEngine,
    db_session: AsyncSession,
    test_user_id: uuid.UUID,
) -> None:
    """If the record was already marked failed (e.g. by the 5-minute self-heal)
    before the job's own completion write runs, the job must not resurrect it
    to completed or create draft transactions the client was never told about."""
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
                ExtractedTransaction(amount=-1_000, currency="IDR", confidence=0.9)
            ]
        )
    )
    mock_r2 = AsyncMock()
    mock_r2.download = AsyncMock(return_value=b"fake-image")

    test_factory = async_sessionmaker(db_engine, expire_on_commit=False)

    with patch("app.domains.finance.jobs.SessionFactory", test_factory), patch(
        "app.domains.finance.repository.update_receipt_log_status_if",
        AsyncMock(return_value=False),
    ):
        await process_receipt(
            vision_llm=mock_llm,
            r2=mock_r2,
            receipt_log_id=str(receipt_log.id),
            account_id=str(account.id),
        )

    await db_session.refresh(receipt_log)
    assert receipt_log.processing_status != VoiceProcessingStatus.completed

    txs = await repo.list_transactions(db_session, test_user_id)
    assert len(txs) == 0
