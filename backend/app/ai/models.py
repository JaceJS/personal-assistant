"""SQLAlchemy model for AI observability traces.

One row per top-level AI call (a voice/receipt extraction, a chat turn) — not
per underlying provider request — so the admin panel can review what the AI
did without needing a full distributed-tracing setup. See `app/ai/tracing.py`
for the writer and `app/domains/admin` for the read side.
"""

from __future__ import annotations

import enum
import uuid

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.shared.models import TimestampedBase


class AiFeature(enum.StrEnum):
    voice_extraction = "voice_extraction"
    receipt_extraction = "receipt_extraction"
    chat = "chat"


class AiTraceStatus(enum.StrEnum):
    success = "success"
    error = "error"


def _pg_enum(enum_cls: type, name: str) -> sa.Enum:
    """Return a PostgreSQL enum column type that reuses an existing DB type."""
    return sa.Enum(enum_cls, name=name, create_type=False)


class AiTrace(TimestampedBase):
    __tablename__ = "ai_traces"

    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    feature: Mapped[AiFeature] = mapped_column(_pg_enum(AiFeature, "ai_feature"), nullable=False)
    model: Mapped[str] = mapped_column(sa.Text(), nullable=False)
    status: Mapped[AiTraceStatus] = mapped_column(
        _pg_enum(AiTraceStatus, "ai_trace_status"), nullable=False
    )
    latency_ms: Mapped[int] = mapped_column(sa.Integer(), nullable=False)
    # Token usage isn't currently surfaced by the provider layer for every call
    # path (see app/ai/llm/openrouter.py) — columns exist now so wiring it up
    # later doesn't need another migration.
    prompt_tokens: Mapped[int | None] = mapped_column(sa.Integer(), nullable=True)
    completion_tokens: Mapped[int | None] = mapped_column(sa.Integer(), nullable=True)
    # Not a real FK: linked_entity_type says which table linked_entity_id refers
    # to (e.g. "voice_log", "receipt_log", "chat_session"), since one trace
    # table serves several unrelated domain entities.
    linked_entity_type: Mapped[str | None] = mapped_column(sa.Text(), nullable=True)
    linked_entity_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    response_excerpt: Mapped[str | None] = mapped_column(sa.Text(), nullable=True)
    error_message: Mapped[str | None] = mapped_column(sa.Text(), nullable=True)
