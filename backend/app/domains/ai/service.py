"""AI domain service — daily insight generation with Redis caching."""

from __future__ import annotations

import uuid
from datetime import UTC, date, datetime, timedelta
from typing import Any

from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.llm.openrouter import OpenRouterLLM
from app.domains.ai.schemas import DailyInsight
from app.domains.ai.tools import (
    _get_budget_status,
    _get_financial_summary,
    _get_spending_by_category,
)

_INSIGHT_CACHE_PREFIX = "ai_insight_v2"

_FALLBACK_INSIGHT = (
    "Terus catat transaksimu untuk mendapatkan insight keuangan yang personal!"
)

_INSIGHT_SYSTEM = (
    "Kamu adalah asisten keuangan pribadi untuk aplikasi budgeting di Indonesia. "
    "Berdasarkan ringkasan keuangan pengguna hari ini, tulis satu insight yang singkat dan actionable "
    "(maksimal 1-2 kalimat). Fokus pada pola pengeluaran, kondisi budget, atau tips menabung yang konkret. "
    "Langsung dan encouraging. "
    "Respond in Bahasa Indonesia, casual tapi profesional. Jangan sertakan salam atau penutup."
)


def _cache_key(user_id: uuid.UUID) -> str:
    return f"{_INSIGHT_CACHE_PREFIX}:{user_id}:{date.today()}"


def _seconds_until_midnight() -> int:
    now = datetime.now(UTC)
    tomorrow = (now + timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
    return max(int((tomorrow - now).total_seconds()), 1)


async def _fetch_financial_context(
    user_id: uuid.UUID, session: AsyncSession
) -> dict[str, Any]:
    summary, budget, categories = (
        await _get_financial_summary(user_id, session),
        await _get_budget_status(user_id, session),
        await _get_spending_by_category(user_id, session),
    )
    return {"summary": summary, "budget": budget, "categories": categories}


def _build_insight_prompt(context: dict[str, Any]) -> str:
    summary = context["summary"]
    budget = context["budget"]
    cats = context["categories"].get("categories", [])

    top_cats = ", ".join(
        f"{c['name']} ({c['amount_formatted']})" for c in cats[:3]
    ) or "none yet"

    budget_line = (
        f"Budget: {budget.get('month_spent_formatted', 'N/A')} of "
        f"{budget.get('monthly_limit_formatted', 'N/A')} used ({budget.get('usage_pct', 0)}%)."
        if budget.get("has_budget")
        else "No monthly budget set."
    )

    return (
        f"Balance: {summary['total_balance_formatted']}. "
        f"Month spend: {summary['month_expense_formatted']}. "
        f"{budget_line} "
        f"Top categories: {top_cats}. "
        f"Give me one actionable insight."
    )


async def get_daily_insight(
    user_id: uuid.UUID,
    session: AsyncSession,
    redis: Redis,
    llm: OpenRouterLLM,
) -> DailyInsight:
    key = _cache_key(user_id)
    cached = await redis.get(key)
    if cached:
        return DailyInsight(
            insight=cached if isinstance(cached, str) else cached.decode(),
            generated_at=datetime.now(UTC),
            is_cached=True,
        )

    try:
        context = await _fetch_financial_context(user_id, session)
        prompt = _build_insight_prompt(context)
        content, _ = await llm.chat_with_tools(
            _INSIGHT_SYSTEM,
            [{"role": "user", "content": prompt}],
            [],
        )
        insight = content.strip() if content else _FALLBACK_INSIGHT
    except Exception:
        insight = _FALLBACK_INSIGHT

    await redis.set(key, insight, ex=_seconds_until_midnight())
    return DailyInsight(insight=insight, generated_at=datetime.now(UTC), is_cached=False)
