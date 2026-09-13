"""AI observability trace writer.

Every top-level AI call site (voice/receipt extraction, a chat turn) calls
`record_trace` once, explicitly -- not the provider class, which only knows
"call this model", not which feature or user the call belongs to. Traces feed
the admin panel (see `app/domains/admin`) for reviewing what the AI did.
"""

from __future__ import annotations

import uuid

import structlog
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.models import AiFeature, AiTrace, AiTraceStatus

log = structlog.get_logger()

# Bounds the row size for a chat reply or extraction result echoed back for
# review; not meant to hold a full transcript or prompt.
_RESPONSE_EXCERPT_MAX_CHARS = 4000


async def record_trace(
    session: AsyncSession,
    *,
    feature: AiFeature,
    user_id: uuid.UUID,
    model: str,
    status: AiTraceStatus,
    latency_ms: int,
    linked_entity_type: str | None = None,
    linked_entity_id: uuid.UUID | None = None,
    response_excerpt: str | None = None,
    error_message: str | None = None,
) -> None:
    """Add one AI trace row to `session` (the caller commits).

    Runs in a SAVEPOINT so a bad trace (e.g. a value that fails a DB
    constraint) rolls back only itself, never the caller's own transaction --
    a tracing bug must never break the AI feature it's observing.
    """
    try:
        async with session.begin_nested():
            session.add(
                AiTrace(
                    feature=feature,
                    user_id=user_id,
                    model=model,
                    status=status,
                    latency_ms=latency_ms,
                    linked_entity_type=linked_entity_type,
                    linked_entity_id=linked_entity_id,
                    response_excerpt=(
                        response_excerpt[:_RESPONSE_EXCERPT_MAX_CHARS]
                        if response_excerpt
                        else None
                    ),
                    error_message=error_message,
                )
            )
    except Exception as exc:
        log.warning(
            "ai_trace_record_failed", feature=str(feature), error_type=type(exc).__name__
        )
