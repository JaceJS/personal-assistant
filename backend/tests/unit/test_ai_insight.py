"""Unit tests for the AI daily insight service (LLM and Redis are mocked)."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.domains.ai.schemas import DailyInsight
from app.domains.ai import service as insight_service


_USER_ID = uuid.uuid4()


def _make_redis(*, cached_value: str | None = None) -> AsyncMock:
    redis = AsyncMock()
    redis.get = AsyncMock(return_value=cached_value)
    redis.set = AsyncMock()
    return redis


def _make_llm(reply: str = "Spend less on coffee.") -> AsyncMock:
    llm = AsyncMock()
    llm.chat_with_tools = AsyncMock(return_value=(reply, []))
    return llm


def _make_session() -> AsyncMock:
    return AsyncMock()


@pytest.fixture
def dummy_context() -> dict:
    return {
        "summary": {"total_balance_formatted": "Rp 1,000,000", "month_expense_formatted": "Rp 200,000"},
        "budget": {"has_budget": True, "usage_pct": 40.0, "remaining_formatted": "Rp 600,000"},
        "categories": {"categories": [{"name": "Food", "amount_formatted": "Rp 100,000"}]},
    }


async def test_get_insight_generates_on_cache_miss(dummy_context: dict) -> None:
    redis = _make_redis(cached_value=None)
    llm = _make_llm("You spent Rp 200,000 this month. Great job!")
    session = _make_session()

    with patch.object(insight_service, "_fetch_financial_context", AsyncMock(return_value=dummy_context)):
        result = await insight_service.get_daily_insight(_USER_ID, session, redis, llm)

    assert isinstance(result, DailyInsight)
    assert result.insight == "You spent Rp 200,000 this month. Great job!"
    assert result.is_cached is False
    llm.chat_with_tools.assert_called_once()
    redis.set.assert_called_once()


async def test_get_insight_returns_cached_result() -> None:
    cached = "You are on track with your budget!"
    redis = _make_redis(cached_value=cached)
    llm = _make_llm()
    session = _make_session()

    result = await insight_service.get_daily_insight(_USER_ID, session, redis, llm)

    assert result.insight == cached
    assert result.is_cached is True
    llm.chat_with_tools.assert_not_called()
    redis.set.assert_not_called()


async def test_insight_cache_key_scoped_to_user() -> None:
    user_a = uuid.uuid4()
    user_b = uuid.uuid4()

    key_a = insight_service._cache_key(user_a)
    key_b = insight_service._cache_key(user_b)

    assert key_a != key_b
    assert str(user_a) in key_a
    assert str(user_b) in key_b


async def test_get_insight_returns_fallback_on_llm_failure(dummy_context: dict) -> None:
    redis = _make_redis(cached_value=None)
    llm = AsyncMock()
    llm.chat_with_tools = AsyncMock(side_effect=RuntimeError("LLM timeout"))
    session = _make_session()

    with patch.object(insight_service, "_fetch_financial_context", AsyncMock(return_value=dummy_context)):
        result = await insight_service.get_daily_insight(_USER_ID, session, redis, llm)

    assert isinstance(result, DailyInsight)
    assert result.insight == insight_service._FALLBACK_INSIGHT
    redis.set.assert_called_once()


def test_insight_system_prompt_in_bahasa_indonesia() -> None:
    assert "Bahasa Indonesia" in insight_service._INSIGHT_SYSTEM
    assert "English" not in insight_service._INSIGHT_SYSTEM


async def test_get_insight_no_transactions_returns_gracefully() -> None:
    empty_context = {
        "summary": {"total_balance_formatted": "Rp 0", "month_expense_formatted": "Rp 0"},
        "budget": {"has_budget": False},
        "categories": {"categories": []},
    }
    redis = _make_redis(cached_value=None)
    llm = _make_llm("No transactions yet — start tracking your expenses!")
    session = _make_session()

    with patch.object(insight_service, "_fetch_financial_context", AsyncMock(return_value=empty_context)):
        result = await insight_service.get_daily_insight(_USER_ID, session, redis, llm)

    assert isinstance(result, DailyInsight)
    assert len(result.insight) > 0
    assert result.generated_at is not None
