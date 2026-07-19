from __future__ import annotations

from datetime import timedelta
from typing import Any

import sqlalchemy as sa
from fastapi import Depends
from sqlalchemy.dialects.postgresql import insert as pg_insert

from app.core.auth import CurrentUser
from app.core.database import DbSession
from app.core.exceptions import TooManyRequestsError
from app.core.models import RateLimitCounter


def per_user_rate_limit(scope: str, limit: int, window_seconds: int) -> Any:
    """FastAPI dependency factory: rate-limit authenticated routes per user_id.

    `scope` names the endpoint (e.g. "voice_upload") so unrelated routes never
    share a counter just because they happen to use the same limit/window.

    Uses an atomic Postgres upsert: the counter resets when the window has
    expired, otherwise increments, so concurrent requests can't race past the
    limit.
    """

    async def _check(session: DbSession, user_id: CurrentUser) -> None:
        key = f"{scope}:{limit}:{window_seconds}:{user_id}"
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

    return Depends(_check)
