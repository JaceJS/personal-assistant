"""AI domain service for daily insight generation with Redis caching."""

from __future__ import annotations

import uuid
from datetime import UTC, date, datetime, timedelta
from typing import Any

from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.llm.openrouter import OpenRouterLLM
from app.core.exceptions import ForbiddenError, NotFoundError
from app.domains.ai import repository as repo
from app.domains.ai.models import ChatMessage, ChatSession
from app.domains.ai.prompts import TONE_RULES
from app.domains.ai.schemas import DailyInsight, DraftTransaction
from app.domains.ai.tools import (
    _get_budget_status,
    _get_financial_summary,
    _get_spending_by_category,
)
from app.domains.finance import repository as finance_repo
from app.domains.finance.models import Transaction

_INSIGHT_CACHE_PREFIX = "ai_insight_v2"

_FALLBACK_INSIGHT = "Terus catat transaksimu untuk mendapatkan insight keuangan yang personal!"

_INSIGHT_SYSTEM = (
    "Kamu adalah asisten keuangan pribadi untuk aplikasi budgeting di Indonesia. "
    "Berdasarkan ringkasan keuangan pengguna hari ini, tulis satu insight yang singkat "
    "dan actionable (maksimal 1-2 kalimat). Fokus pada pola pengeluaran, kondisi budget, "
    "atau tips menabung yang konkret. Langsung dan encouraging. Jangan sertakan salam "
    f"atau penutup. {TONE_RULES}"
)


def _cache_key(user_id: uuid.UUID) -> str:
    return f"{_INSIGHT_CACHE_PREFIX}:{user_id}:{date.today()}"


def _seconds_until_midnight() -> int:
    now = datetime.now(UTC)
    tomorrow = (now + timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
    return max(int((tomorrow - now).total_seconds()), 1)


async def _fetch_financial_context(user_id: uuid.UUID, session: AsyncSession) -> dict[str, Any]:
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

    top_cats = ", ".join(f"{c['name']} ({c['amount_formatted']})" for c in cats[:3]) or "none yet"

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


async def _to_draft_transaction(db: AsyncSession, tx: Transaction) -> DraftTransaction:
    category_name = None
    if tx.category_id is not None:
        category = await finance_repo.get_category(db, tx.category_id)
        category_name = category.name if category else None

    return DraftTransaction(
        transaction_id=tx.id,
        amount=tx.amount,
        currency=tx.currency,
        merchant=tx.merchant,
        category_name=category_name,
        note=tx.note,
        account_id=tx.account_id,
    )


async def get_session_messages(
    user_id: uuid.UUID,
    session_id: uuid.UUID,
    db: AsyncSession,
) -> tuple[list[ChatMessage], list[DraftTransaction]]:
    chat_session = await db.get(ChatSession, session_id)
    if chat_session is None:
        raise NotFoundError("Session not found")
    if chat_session.user_id != user_id:
        raise ForbiddenError("Access denied")

    messages = await repo.get_recent_messages(db, session_id, limit=20)
    draft_rows = await finance_repo.get_pending_draft_transactions(db, session_id)
    drafts = [await _to_draft_transaction(db, tx) for tx in draft_rows]
    return messages, drafts


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
