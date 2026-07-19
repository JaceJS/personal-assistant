"""SQLAlchemy models for AI chat sessions and messages."""

from __future__ import annotations

import uuid
from datetime import date

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.shared.models import TimestampedBase


class ChatSession(TimestampedBase):
    __tablename__ = "chat_sessions"

    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)


class ChatMessage(TimestampedBase):
    __tablename__ = "chat_messages"

    session_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        sa.ForeignKey("chat_sessions.id", ondelete="CASCADE"),
        nullable=False,
    )
    role: Mapped[str] = mapped_column(sa.Text(), nullable=False)  # user | assistant
    content: Mapped[str] = mapped_column(sa.Text(), nullable=False)


class DailyInsightCache(TimestampedBase):
    __tablename__ = "daily_insight_cache"

    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, unique=True)
    insight: Mapped[str] = mapped_column(sa.Text(), nullable=False)
    generated_date: Mapped[date] = mapped_column(sa.Date(), nullable=False)
