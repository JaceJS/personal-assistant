"""Unit tests for the transaction extractor (LLM is mocked)."""

from __future__ import annotations

from unittest.mock import AsyncMock

import pytest

from app.domains.finance.extractor import ExtractedTransaction, extract_transaction


@pytest.fixture
def mock_llm() -> AsyncMock:
    llm = AsyncMock()
    llm.extract = AsyncMock()
    return llm


async def test_extract_returns_structured_result(mock_llm: AsyncMock) -> None:
    expected = ExtractedTransaction(amount=-50_000, currency="IDR", confidence=0.9)
    mock_llm.extract.return_value = expected

    result = await extract_transaction("beli kopi gocap", mock_llm)

    assert result.amount == -50_000
    assert result.currency == "IDR"
    mock_llm.extract.assert_called_once()


async def test_extract_passes_transcript_as_user_content(mock_llm: AsyncMock) -> None:
    mock_llm.extract.return_value = ExtractedTransaction(
        amount=-10_000, currency="IDR", confidence=0.8
    )

    await extract_transaction("beli ceban", mock_llm)

    _, kwargs = mock_llm.extract.call_args
    assert kwargs["user_content"] == "beli ceban"


async def test_expense_has_negative_amount(mock_llm: AsyncMock) -> None:
    mock_llm.extract.return_value = ExtractedTransaction(
        amount=-25_000, currency="IDR", merchant="Indomaret", confidence=0.95
    )

    result = await extract_transaction("beli jajan 25rb di indomaret", mock_llm)

    assert result.amount < 0
    assert result.merchant == "Indomaret"
