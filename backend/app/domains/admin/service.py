"""Admin domain service: read-only AI observability queries."""

from __future__ import annotations

import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.models import AiFeature, AiTrace, AiTraceStatus
from app.core.exceptions import NotFoundError
from app.domains.admin import repository as repo
from app.domains.admin.repository import TraceStat


async def list_traces(
    session: AsyncSession,
    *,
    feature: AiFeature | None = None,
    status: AiTraceStatus | None = None,
    limit: int = 50,
    offset: int = 0,
) -> tuple[list[AiTrace], int]:
    items = await repo.list_traces(
        session, feature=feature, status=status, limit=limit, offset=offset
    )
    total = await repo.count_traces(session, feature=feature, status=status)
    return items, total


async def get_trace(session: AsyncSession, trace_id: uuid.UUID) -> AiTrace:
    trace = await repo.get_trace(session, trace_id)
    if trace is None:
        raise NotFoundError(f"Trace {trace_id} not found")
    return trace


async def get_trace_stats(session: AsyncSession) -> list[TraceStat]:
    return await repo.get_trace_stats(session)
