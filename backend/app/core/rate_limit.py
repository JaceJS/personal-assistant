from __future__ import annotations

from typing import Any

from fastapi import Depends, Request

from app.core.auth import CurrentUser
from app.core.exceptions import TooManyRequestsError


def per_user_rate_limit(limit: int, window_seconds: int) -> Any:
    """FastAPI dependency factory: rate-limit authenticated routes per user_id.

    Uses an atomic Redis pipeline (SET NX EX + INCR) so the TTL is always set
    on first access and there is no race between INCR and EXPIRE.
    """

    async def _check(request: Request, user_id: CurrentUser) -> None:
        redis = request.app.state.redis
        key = f"ratelimit:{limit}:{window_seconds}:{user_id}"
        pipe = redis.pipeline()
        pipe.set(key, 0, nx=True, ex=window_seconds)
        pipe.incr(key)
        results = await pipe.execute()
        count: int = results[1]
        if count > limit:
            hours = window_seconds // 3600
            raise TooManyRequestsError(
                f"Rate limit: max {limit} requests per {hours}h"
            )

    return Depends(_check)
