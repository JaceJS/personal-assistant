"""AI domain repository for chat session and message persistence."""

from __future__ import annotations

import uuid
from datetime import date

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.ai.models import ChatMessage, ChatSession, DailyInsightCache


async def create_session(db: AsyncSession, user_id: uuid.UUID) -> ChatSession:
    session = ChatSession(user_id=user_id)
    db.add(session)
    await db.flush()
    return session


async def get_or_create_session(
    db: AsyncSession,
    user_id: uuid.UUID,
    session_id: uuid.UUID | None,
) -> ChatSession:
    """Return existing session if valid for this user, else create new one."""
    if session_id is not None:
        existing = await db.get(ChatSession, session_id)
        if existing is not None and existing.user_id == user_id:
            return existing
    return await create_session(db, user_id)


async def add_message(
    db: AsyncSession,
    session_id: uuid.UUID,
    role: str,
    content: str,
) -> ChatMessage:
    msg = ChatMessage(session_id=session_id, role=role, content=content)
    db.add(msg)
    await db.flush()
    return msg


async def get_recent_messages(
    db: AsyncSession,
    session_id: uuid.UUID,
    *,
    limit: int = 20,
) -> list[ChatMessage]:
    """Return last `limit` messages ordered oldest-first for LLM context."""
    subq = (
        sa.select(ChatMessage)
        .where(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.created_at.desc())
        .limit(limit)
        .subquery()
    )
    result = await db.execute(
        sa.select(ChatMessage)
        .where(ChatMessage.id == subq.c.id)
        .order_by(ChatMessage.created_at.asc())
    )
    return list(result.scalars())


async def get_daily_insight_cache(db: AsyncSession, user_id: uuid.UUID) -> DailyInsightCache | None:
    result = await db.execute(
        sa.select(DailyInsightCache).where(DailyInsightCache.user_id == user_id)
    )
    return result.scalar_one_or_none()


async def upsert_daily_insight_cache(
    db: AsyncSession, user_id: uuid.UUID, insight: str, generated_date: date
) -> DailyInsightCache:
    stmt = (
        pg_insert(DailyInsightCache)
        .values(user_id=user_id, insight=insight, generated_date=generated_date)
        .on_conflict_do_update(
            index_elements=["user_id"],
            set_={
                "insight": insight,
                "generated_date": generated_date,
                "updated_at": sa.func.now(),
            },
        )
        .returning(DailyInsightCache)
    )
    result = await db.execute(stmt)
    await db.flush()
    return result.scalar_one()
