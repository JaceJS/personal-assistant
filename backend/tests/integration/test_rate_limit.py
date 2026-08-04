"""Integration tests: Postgres-backed per-user rate limiting."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta
from unittest.mock import MagicMock

import pytest
import sqlalchemy as sa
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import TooManyRequestsError
from app.core.models import RateLimitCounter
from app.core.rate_limit import increment_counter, per_ip_rate_limit, per_user_rate_limit

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


async def test_increment_counter_returns_running_count(db_session: AsyncSession) -> None:
    key = f"direct_key:{uuid.uuid4()}"
    assert await increment_counter(db_session, key, 5, 3600) == 1
    assert await increment_counter(db_session, key, 5, 3600) == 2
    assert await increment_counter(db_session, key, 5, 3600) == 3


async def test_increment_counter_raises_once_over_limit(db_session: AsyncSession) -> None:
    key = f"direct_key:{uuid.uuid4()}"
    await increment_counter(db_session, key, 2, 3600)
    await increment_counter(db_session, key, 2, 3600)

    with pytest.raises(TooManyRequestsError):
        await increment_counter(db_session, key, 2, 3600)


async def test_increment_counter_independent_keys_do_not_share_state(
    db_session: AsyncSession,
) -> None:
    a, b = f"key_a:{uuid.uuid4()}", f"key_b:{uuid.uuid4()}"
    assert await increment_counter(db_session, a, 1, 3600) == 1
    assert await increment_counter(db_session, b, 1, 3600) == 1


async def _check_ip(
    scope: str, limit: int, window_seconds: int, session: AsyncSession, client_host: str
) -> None:
    dep = per_ip_rate_limit(scope, limit, window_seconds)
    request = MagicMock()
    request.client.host = client_host
    await dep.dependency(request=request, session=session)


async def test_per_ip_rate_limit_allows_requests_within_limit(db_session: AsyncSession) -> None:
    for _ in range(3):
        await _check_ip("ip_within_limit", 3, 3600, db_session, "1.2.3.4")


async def test_per_ip_rate_limit_raises_when_exceeded(db_session: AsyncSession) -> None:
    for _ in range(2):
        await _check_ip("ip_exceed", 2, 3600, db_session, "1.2.3.4")

    with pytest.raises(TooManyRequestsError):
        await _check_ip("ip_exceed", 2, 3600, db_session, "1.2.3.4")


async def test_per_ip_rate_limit_different_ips_have_independent_counters(
    db_session: AsyncSession,
) -> None:
    await _check_ip("ip_independent", 1, 3600, db_session, "1.1.1.1")
    await _check_ip("ip_independent", 1, 3600, db_session, "2.2.2.2")
