"""Integration tests: record_trace (AI observability writer)."""

from __future__ import annotations

import uuid

import pytest
import sqlalchemy as sa
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.models import AiFeature, AiTrace, AiTraceStatus
from app.ai.tracing import record_trace

pytestmark = pytest.mark.integration


async def test_records_a_successful_trace(
    db_session: AsyncSession, test_user_id: uuid.UUID
) -> None:
    linked_id = uuid.uuid4()
    await record_trace(
        db_session,
        feature=AiFeature.voice_extraction,
        user_id=test_user_id,
        model="meta-llama/llama-3.3-70b-instruct",
        status=AiTraceStatus.success,
        latency_ms=1234,
        linked_entity_type="voice_log",
        linked_entity_id=linked_id,
        response_excerpt="beli kopi 15000",
    )
    await db_session.commit()

    trace = (
        await db_session.execute(sa.select(AiTrace).where(AiTrace.user_id == test_user_id))
    ).scalar_one()
    assert trace.feature == AiFeature.voice_extraction
    assert trace.status == AiTraceStatus.success
    assert trace.latency_ms == 1234
    assert trace.linked_entity_type == "voice_log"
    assert trace.linked_entity_id == linked_id
    assert trace.response_excerpt == "beli kopi 15000"
    assert trace.error_message is None


async def test_records_an_error_trace(db_session: AsyncSession, test_user_id: uuid.UUID) -> None:
    await record_trace(
        db_session,
        feature=AiFeature.chat,
        user_id=test_user_id,
        model="meta-llama/llama-3.3-70b-instruct",
        status=AiTraceStatus.error,
        latency_ms=500,
        error_message="RateLimitError: too many requests",
    )
    await db_session.commit()

    trace = (
        await db_session.execute(
            sa.select(AiTrace).where(
                AiTrace.user_id == test_user_id, AiTrace.status == AiTraceStatus.error
            )
        )
    ).scalar_one()
    assert trace.error_message == "RateLimitError: too many requests"
    assert trace.response_excerpt is None


async def test_truncates_long_response_excerpts(
    db_session: AsyncSession, test_user_id: uuid.UUID
) -> None:
    long_response = "x" * 10_000
    await record_trace(
        db_session,
        feature=AiFeature.chat,
        user_id=test_user_id,
        model="m",
        status=AiTraceStatus.success,
        latency_ms=1,
        response_excerpt=long_response,
    )
    await db_session.commit()

    trace = (
        await db_session.execute(
            sa.select(AiTrace).where(
                AiTrace.user_id == test_user_id, AiTrace.model == "m"
            )
        )
    ).scalar_one()
    assert trace.response_excerpt is not None
    assert len(trace.response_excerpt) <= 4000


async def test_never_raises_and_leaves_session_usable(
    db_session: AsyncSession, test_user_id: uuid.UUID
) -> None:
    """A trace-write failure must never break the feature it's observing."""
    # feature="not-a-real-enum-value" violates the DB enum constraint at flush
    # time -- record_trace must absorb that, not propagate it.
    await record_trace(
        db_session,
        feature="not-a-real-enum-value",  # type: ignore[arg-type]
        user_id=test_user_id,
        model="m",
        status=AiTraceStatus.success,
        latency_ms=1,
    )
    # The session must still be usable for subsequent queries in the same
    # request/job after a swallowed trace-write failure.
    result = await db_session.execute(sa.select(sa.literal(1)))
    assert result.scalar_one() == 1
