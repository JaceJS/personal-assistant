"""Unit tests for the receipt extractor (LLM is mocked)."""

from __future__ import annotations

from unittest.mock import AsyncMock

import pytest

from app.core.exceptions import BadRequestError
from app.domains.finance.extractor import ExtractedTransaction, ExtractedTransactionList
from app.domains.finance.receipt_extractor import (
    MAX_TRANSACTIONS_PER_RECEIPT,
    extract_transactions_from_receipt,
)


@pytest.fixture
def mock_llm() -> AsyncMock:
    llm = AsyncMock()
    llm.extract_from_image = AsyncMock()
    return llm


def _tx(**overrides: object) -> ExtractedTransaction:
    defaults: dict[str, object] = {"amount": -50_000, "currency": "IDR", "confidence": 0.9}
    defaults.update(overrides)
    return ExtractedTransaction(**defaults)  # type: ignore[arg-type]


async def test_extract_from_receipt_returns_list(mock_llm: AsyncMock) -> None:
    mock_llm.extract_from_image.return_value = ExtractedTransactionList(
        transactions=[_tx(amount=-120_000, merchant="Indomaret")]
    )

    result = await extract_transactions_from_receipt(b"fakejpeg", "image/jpeg", mock_llm)

    assert len(result) == 1
    assert result[0].merchant == "Indomaret"


async def test_extract_from_receipt_multiple_distinct_categories(mock_llm: AsyncMock) -> None:
    mock_llm.extract_from_image.return_value = ExtractedTransactionList(
        transactions=[
            _tx(amount=-80_000, category_name="Groceries"),
            _tx(amount=-40_000, category_name="Kesehatan"),
        ]
    )

    result = await extract_transactions_from_receipt(b"fakejpeg", "image/jpeg", mock_llm)

    assert len(result) == 2
    assert result[0].category_name == "Groceries"
    assert result[1].category_name == "Kesehatan"


async def test_extract_from_receipt_passes_image_bytes_and_media_type(mock_llm: AsyncMock) -> None:
    mock_llm.extract_from_image.return_value = ExtractedTransactionList(transactions=[_tx()])

    await extract_transactions_from_receipt(b"rawbytes", "image/png", mock_llm)

    _, kwargs = mock_llm.extract_from_image.call_args
    assert kwargs["image_bytes"] == b"rawbytes"
    assert kwargs["image_media_type"] == "image/png"
    assert kwargs["response_model"] is ExtractedTransactionList


async def test_extract_from_receipt_drops_low_confidence_items(mock_llm: AsyncMock) -> None:
    mock_llm.extract_from_image.return_value = ExtractedTransactionList(
        transactions=[_tx(amount=-80_000, confidence=0.9), _tx(amount=-3_000, confidence=0.1)]
    )

    result = await extract_transactions_from_receipt(b"fakejpeg", "image/jpeg", mock_llm)

    assert len(result) == 1
    assert result[0].amount == -80_000


async def test_extract_from_receipt_raises_when_none_confident(mock_llm: AsyncMock) -> None:
    mock_llm.extract_from_image.return_value = ExtractedTransactionList(
        transactions=[_tx(confidence=0.1)]
    )

    with pytest.raises(BadRequestError):
        await extract_transactions_from_receipt(b"blurry", "image/jpeg", mock_llm)


async def test_extract_from_receipt_raises_when_no_transactions_found(mock_llm: AsyncMock) -> None:
    mock_llm.extract_from_image.return_value = ExtractedTransactionList(transactions=[])

    with pytest.raises(BadRequestError):
        await extract_transactions_from_receipt(b"blank", "image/jpeg", mock_llm)


async def test_extract_from_receipt_caps_at_max_items(mock_llm: AsyncMock) -> None:
    many = [
        _tx(amount=-1_000 * i, confidence=0.9)
        for i in range(1, MAX_TRANSACTIONS_PER_RECEIPT + 5)
    ]
    mock_llm.extract_from_image.return_value = ExtractedTransactionList(transactions=many)

    result = await extract_transactions_from_receipt(b"longreceipt", "image/jpeg", mock_llm)

    assert len(result) == MAX_TRANSACTIONS_PER_RECEIPT
