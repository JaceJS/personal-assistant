from __future__ import annotations

from datetime import timedelta
from typing import Any

import sqlalchemy as sa
from fastapi import Depends, Request
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import CurrentUser
from app.core.database import DbSession
from app.core.exceptions import TooManyRequestsError
from app.core.models import RateLimitCounter


async def increment_counter(
    session: AsyncSession, key: str, limit: int, window_seconds: int
) -> int:
    """Atomically increment the counter for `key`, resetting it if the window
    has expired, and return the resulting count.

    Shared primitive behind every rate-limit flavor (per-user, per-IP, or a
    long-window "lifetime" quota) — same atomic Postgres upsert either way,
    just keyed and windowed differently by the caller. Raises
    TooManyRequestsError once `count` exceeds `limit`, so callers that don't
    need the count back can ignore the return value entirely.
    """
    now = sa.func.now()
    new_expires_at = now + timedelta(seconds=window_seconds)
    stmt = (
        pg_insert(RateLimitCounter)
        .values(key=key, count=1, expires_at=new_expires_at)
        .on_conflict_do_update(
            index_elements=["key"],
            set_={
                "count": sa.case(
                    (RateLimitCounter.expires_at < now, 1),
                    else_=RateLimitCounter.count + 1,
                ),
                "expires_at": sa.case(
                    (RateLimitCounter.expires_at < now, new_expires_at),
                    else_=RateLimitCounter.expires_at,
                ),
                "updated_at": now,
            },
        )
        .returning(RateLimitCounter.count)
    )
    result = await session.execute(stmt)
    await session.flush()
    count = result.scalar_one()
    if count > limit:
        hours = window_seconds // 3600
        raise TooManyRequestsError(f"Rate limit: max {limit} requests per {hours}h")
    return count


def per_user_rate_limit(scope: str, limit: int, window_seconds: int) -> Any:
    """FastAPI dependency factory: rate-limit authenticated routes per user_id.

    `scope` names the endpoint (e.g. "voice_upload") so unrelated routes never
    share a counter just because they happen to use the same limit/window.
    """

    async def _check(session: DbSession, user_id: CurrentUser) -> None:
        key = f"{scope}:{limit}:{window_seconds}:{user_id}"
        await increment_counter(session, key, limit, window_seconds)

    return Depends(_check)


def per_ip_rate_limit(scope: str, limit: int, window_seconds: int) -> Any:
    """FastAPI dependency factory: rate-limit unauthenticated routes per client
    IP. For endpoints with no CurrentUser (e.g. anonymous guest chat), this is
    the coarse defense-in-depth layer against a single source hammering the
    endpoint with many different identifiers."""

    async def _check(request: Request, session: DbSession) -> None:
        client_host = request.client.host if request.client else "unknown"
        key = f"{scope}:{limit}:{window_seconds}:{client_host}"
        await increment_counter(session, key, limit, window_seconds)

    return Depends(_check)
