"""Unit tests for the transaction extractor (LLM is mocked)."""

from __future__ import annotations

from unittest.mock import AsyncMock

import pytest

from app.core.exceptions import BadRequestError
from app.domains.finance.extractor import (
    MAX_TRANSACTIONS_PER_VOICE_NOTE,
    ExtractedTransaction,
    ExtractedTransactionList,
    extract_transactions,
)


@pytest.fixture
def mock_llm() -> AsyncMock:
    llm = AsyncMock()
    llm.extract = AsyncMock()
    return llm


def _tx(**overrides: object) -> ExtractedTransaction:
    defaults: dict[str, object] = {"amount": -50_000, "currency": "IDR", "confidence": 0.9}
    defaults.update(overrides)
    return ExtractedTransaction(**defaults)  # type: ignore[arg-type]


async def test_extract_returns_list_of_transactions(mock_llm: AsyncMock) -> None:
    mock_llm.extract.return_value = ExtractedTransactionList(
        transactions=[_tx(amount=-50_000), _tx(amount=-5_000, merchant="Parkiran")]
    )

    result = await extract_transactions("beli kopi gocap sama parkir 5rb", mock_llm)

    assert len(result) == 2
    assert result[0].amount == -50_000
    assert result[1].merchant == "Parkiran"
    mock_llm.extract.assert_called_once()


async def test_extract_single_item_still_returns_list_of_one(mock_llm: AsyncMock) -> None:
    mock_llm.extract.return_value = ExtractedTransactionList(transactions=[_tx(amount=-10_000)])

    result = await extract_transactions("beli ceban", mock_llm)

    assert result == [_tx(amount=-10_000)]


async def test_extract_passes_transcript_as_user_content(mock_llm: AsyncMock) -> None:
    mock_llm.extract.return_value = ExtractedTransactionList(transactions=[_tx()])

    await extract_transactions("beli ceban", mock_llm)

    _, kwargs = mock_llm.extract.call_args
    assert kwargs["user_content"] == "beli ceban"
    assert kwargs["response_model"] is ExtractedTransactionList


async def test_extract_drops_low_confidence_items_keeps_high_confidence(
    mock_llm: AsyncMock,
) -> None:
    mock_llm.extract.return_value = ExtractedTransactionList(
        transactions=[_tx(amount=-50_000, confidence=0.9), _tx(amount=-5_000, confidence=0.1)]
    )

    result = await extract_transactions("beli kopi gocap sama entah apa", mock_llm)

    assert len(result) == 1
    assert result[0].amount == -50_000


async def test_extract_raises_when_all_items_below_confidence(mock_llm: AsyncMock) -> None:
    mock_llm.extract.return_value = ExtractedTransactionList(
        transactions=[_tx(confidence=0.1), _tx(confidence=0.2)]
    )

    with pytest.raises(BadRequestError):
        await extract_transactions("ngomong ga jelas", mock_llm)


async def test_extract_raises_when_no_transactions_found(mock_llm: AsyncMock) -> None:
    mock_llm.extract.return_value = ExtractedTransactionList(transactions=[])

    with pytest.raises(BadRequestError):
        await extract_transactions("halo apa kabar", mock_llm)


async def test_extract_caps_at_max_items(mock_llm: AsyncMock) -> None:
    many = [
        _tx(amount=-1_000 * i, confidence=0.9)
        for i in range(1, MAX_TRANSACTIONS_PER_VOICE_NOTE + 5)
    ]
    mock_llm.extract.return_value = ExtractedTransactionList(transactions=many)

    result = await extract_transactions("banyak banget item", mock_llm)

    assert len(result) == MAX_TRANSACTIONS_PER_VOICE_NOTE


async def test_expense_has_negative_amount(mock_llm: AsyncMock) -> None:
    mock_llm.extract.return_value = ExtractedTransactionList(
        transactions=[_tx(amount=-25_000, merchant="Indomaret", confidence=0.95)]
    )

    result = await extract_transactions("beli jajan 25rb di indomaret", mock_llm)

    assert result[0].amount < 0
    assert result[0].merchant == "Indomaret"
