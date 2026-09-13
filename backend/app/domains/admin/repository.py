"""Read-only repository for admin AI-observability queries."""

from __future__ import annotations

import uuid
from dataclasses import dataclass

import sqlalchemy as sa
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.models import AiFeature, AiTrace, AiTraceStatus


@dataclass
class TraceStat:
    feature: AiFeature
    status: AiTraceStatus
    count: int
    avg_latency_ms: float


async def list_traces(
    session: AsyncSession,
    *,
    feature: AiFeature | None = None,
    status: AiTraceStatus | None = None,
    limit: int = 50,
    offset: int = 0,
) -> list[AiTrace]:
    q = sa.select(AiTrace)
    if feature is not None:
        q = q.where(AiTrace.feature == feature)
    if status is not None:
        q = q.where(AiTrace.status == status)
    q = q.order_by(AiTrace.created_at.desc()).limit(limit).offset(offset)
    result = await session.execute(q)
    return list(result.scalars().all())


async def count_traces(
    session: AsyncSession,
    *,
    feature: AiFeature | None = None,
    status: AiTraceStatus | None = None,
) -> int:
    q = sa.select(sa.func.count()).select_from(AiTrace)
    if feature is not None:
        q = q.where(AiTrace.feature == feature)
    if status is not None:
        q = q.where(AiTrace.status == status)
    result = await session.execute(q)
    return result.scalar_one()


async def get_trace(session: AsyncSession, trace_id: uuid.UUID) -> AiTrace | None:
    return await session.get(AiTrace, trace_id)


async def get_trace_stats(session: AsyncSession) -> list[TraceStat]:
    """Row counts and average latency, grouped by feature x status."""
    q = (
        sa.select(
            AiTrace.feature,
            AiTrace.status,
            # "count" collides with Row's own tuple.count method (attribute
            # access would return the method, not the value) -- trace_count
            # sidesteps that entirely.
            sa.func.count().label("trace_count"),
            sa.func.avg(AiTrace.latency_ms).label("avg_latency_ms"),
        )
        .group_by(AiTrace.feature, AiTrace.status)
        .order_by(AiTrace.feature, AiTrace.status)
    )
    result = await session.execute(q)
    return [
        TraceStat(
            feature=row.feature,
            status=row.status,
            count=row.trace_count,
            avg_latency_ms=float(row.avg_latency_ms),
        )
        for row in result.all()
    ]
