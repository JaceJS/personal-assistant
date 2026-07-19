"""Unit tests for the AI daily insight service (LLM and cache repository are mocked)."""

from __future__ import annotations

import uuid
from datetime import date
from unittest.mock import AsyncMock, patch

import pytest

from app.domains.ai import service as insight_service
from app.domains.ai.models import DailyInsightCache
from app.domains.ai.schemas import DailyInsight

_USER_ID = uuid.uuid4()


def _make_cache_row(*, insight: str, generated_date: date) -> DailyInsightCache:
    return DailyInsightCache(user_id=_USER_ID, insight=insight, generated_date=generated_date)


def _make_llm(reply: str = "Spend less on coffee.") -> AsyncMock:
    llm = AsyncMock()
    llm.chat_with_tools = AsyncMock(return_value=(reply, []))
    return llm


def _make_session() -> AsyncMock:
    return AsyncMock()


@pytest.fixture
def dummy_context() -> dict:
    return {
        "summary": {
            "total_balance_formatted": "Rp 1,000,000",
            "month_expense_formatted": "Rp 200,000",
        },
        "budget": {"has_budget": True, "usage_pct": 40.0, "remaining_formatted": "Rp 600,000"},
        "categories": {"categories": [{"name": "Food", "amount_formatted": "Rp 100,000"}]},
    }


async def test_get_insight_generates_on_cache_miss(dummy_context: dict) -> None:
    llm = _make_llm("You spent Rp 200,000 this month. Great job!")
    session = _make_session()

    mock_ctx = AsyncMock(return_value=dummy_context)
    mock_get_cache = AsyncMock(return_value=None)
    mock_upsert = AsyncMock()
    with (
        patch.object(insight_service, "_fetch_financial_context", mock_ctx),
        patch.object(insight_service.repo, "get_daily_insight_cache", mock_get_cache),
        patch.object(insight_service.repo, "upsert_daily_insight_cache", mock_upsert),
    ):
        result = await insight_service.get_daily_insight(_USER_ID, session, llm)

    assert isinstance(result, DailyInsight)
    assert result.insight == "You spent Rp 200,000 this month. Great job!"
    assert result.is_cached is False
    llm.chat_with_tools.assert_called_once()
    mock_upsert.assert_called_once()


async def test_get_insight_returns_cached_result_from_today() -> None:
    cached_row = _make_cache_row(
        insight="You are on track with your budget!", generated_date=date.today()
    )
    llm = _make_llm()
    session = _make_session()
    mock_get_cache = AsyncMock(return_value=cached_row)

    with patch.object(insight_service.repo, "get_daily_insight_cache", mock_get_cache):
        result = await insight_service.get_daily_insight(_USER_ID, session, llm)

    assert result.insight == cached_row.insight
    assert result.is_cached is True
    llm.chat_with_tools.assert_not_called()


async def test_stale_cache_from_previous_day_regenerates(dummy_context: dict) -> None:
    stale_row = _make_cache_row(insight="yesterday's insight", generated_date=date(2020, 1, 1))
    llm = _make_llm("Fresh insight today.")
    session = _make_session()

    mock_ctx = AsyncMock(return_value=dummy_context)
    mock_get_cache = AsyncMock(return_value=stale_row)
    mock_upsert = AsyncMock()
    with (
        patch.object(insight_service, "_fetch_financial_context", mock_ctx),
        patch.object(insight_service.repo, "get_daily_insight_cache", mock_get_cache),
        patch.object(insight_service.repo, "upsert_daily_insight_cache", mock_upsert),
    ):
        result = await insight_service.get_daily_insight(_USER_ID, session, llm)

    assert result.insight == "Fresh insight today."
    assert result.is_cached is False
    mock_upsert.assert_called_once()


async def test_get_insight_returns_fallback_on_llm_failure(dummy_context: dict) -> None:
    llm = AsyncMock()
    llm.chat_with_tools = AsyncMock(side_effect=RuntimeError("LLM timeout"))
    session = _make_session()

    mock_ctx = AsyncMock(return_value=dummy_context)
    mock_get_cache = AsyncMock(return_value=None)
    mock_upsert = AsyncMock()
    with (
        patch.object(insight_service, "_fetch_financial_context", mock_ctx),
        patch.object(insight_service.repo, "get_daily_insight_cache", mock_get_cache),
        patch.object(insight_service.repo, "upsert_daily_insight_cache", mock_upsert),
    ):
        result = await insight_service.get_daily_insight(_USER_ID, session, llm)

    assert isinstance(result, DailyInsight)
    assert result.insight == insight_service._FALLBACK_INSIGHT
    mock_upsert.assert_called_once()


def test_insight_system_prompt_in_bahasa_indonesia() -> None:
    assert "Bahasa Indonesia" in insight_service._INSIGHT_SYSTEM
    assert "English" not in insight_service._INSIGHT_SYSTEM


async def test_get_insight_no_transactions_returns_gracefully() -> None:
    empty_context = {
        "summary": {"total_balance_formatted": "Rp 0", "month_expense_formatted": "Rp 0"},
        "budget": {"has_budget": False},
        "categories": {"categories": []},
    }
    llm = _make_llm("No transactions yet, start tracking your expenses!")
    session = _make_session()

    mock_ctx = AsyncMock(return_value=empty_context)
    mock_get_cache = AsyncMock(return_value=None)
    mock_upsert = AsyncMock()
    with (
        patch.object(insight_service, "_fetch_financial_context", mock_ctx),
        patch.object(insight_service.repo, "get_daily_insight_cache", mock_get_cache),
        patch.object(insight_service.repo, "upsert_daily_insight_cache", mock_upsert),
    ):
        result = await insight_service.get_daily_insight(_USER_ID, session, llm)

    assert isinstance(result, DailyInsight)
    assert len(result.insight) > 0
    assert result.generated_at is not None
