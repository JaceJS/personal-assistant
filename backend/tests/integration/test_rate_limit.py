"""Integration tests: Postgres-backed per-user rate limiting."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta

import pytest
import sqlalchemy as sa
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import TooManyRequestsError
from app.core.models import RateLimitCounter
from app.core.rate_limit import per_user_rate_limit

pytestmark = pytest.mark.integration


async def _check(
    scope: str, limit: int, window_seconds: int, session: AsyncSession, user_id: uuid.UUID
) -> None:
    dep = per_user_rate_limit(scope, limit, window_seconds)
    await dep.dependency(session=session, user_id=user_id)


async def test_requests_within_limit_do_not_raise(db_session: AsyncSession) -> None:
    user_id = uuid.uuid4()
    for _ in range(3):
        await _check("test_within_limit", 3, 3600, db_session, user_id)


async def test_exceeding_limit_raises(db_session: AsyncSession) -> None:
    user_id = uuid.uuid4()
    for _ in range(2):
        await _check("test_exceed_limit", 2, 3600, db_session, user_id)

    with pytest.raises(TooManyRequestsError):
        await _check("test_exceed_limit", 2, 3600, db_session, user_id)


async def test_different_scopes_use_different_counters(db_session: AsyncSession) -> None:
    user_id = uuid.uuid4()
    await _check("scope_a", 1, 3600, db_session, user_id)
    await _check("scope_b", 1, 3600, db_session, user_id)


async def test_counter_resets_after_window_expires(db_session: AsyncSession) -> None:
    user_id = uuid.uuid4()
    key = f"expiring_scope:1:1:{user_id}"
    await db_session.execute(
        sa.insert(RateLimitCounter).values(
            key=key, count=1, expires_at=datetime.now(UTC) - timedelta(seconds=1)
        )
    )
    await db_session.commit()

    await _check("expiring_scope", 1, 1, db_session, user_id)
