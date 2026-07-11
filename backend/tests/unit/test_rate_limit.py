"""Unit tests for per_user_rate_limit: keys must be scoped per-route.

Two different routes sharing the same (limit, window) must not share a
counter — otherwise activity on one endpoint silently eats another
endpoint's quota (found in security review: voice upload, receipt upload,
and AI chat all used 60/3600, so calling one exhausted the others).
"""

from __future__ import annotations

import uuid
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi import Request

from app.core.exceptions import TooManyRequestsError
from app.core.rate_limit import per_user_rate_limit


def _make_request_with_redis() -> tuple[Request, MagicMock]:
    redis = MagicMock()
    pipe = MagicMock()
    pipe.execute = AsyncMock(return_value=[True, 1])
    redis.pipeline.return_value = pipe
    request = MagicMock(spec=Request)
    request.app.state.redis = redis
    return request, redis


async def test_different_scopes_use_different_redis_keys() -> None:
    user_id = uuid.uuid4()
    request_a, redis_a = _make_request_with_redis()
    request_b, redis_b = _make_request_with_redis()

    dep_a = per_user_rate_limit("voice_upload", 60, 3600)
    dep_b = per_user_rate_limit("ai_chat", 60, 3600)

    await dep_a.dependency(request_a, user_id)
    await dep_b.dependency(request_b, user_id)

    key_a = redis_a.pipeline.return_value.set.call_args[0][0]
    key_b = redis_b.pipeline.return_value.set.call_args[0][0]
    assert key_a != key_b
    assert "voice_upload" in key_a
    assert "ai_chat" in key_b


async def test_exceeding_limit_raises() -> None:
    user_id = uuid.uuid4()
    request, redis = _make_request_with_redis()
    redis.pipeline.return_value.execute = AsyncMock(return_value=[True, 5])

    dep = per_user_rate_limit("voice_upload", 3, 3600)
    with pytest.raises(TooManyRequestsError):
        await dep.dependency(request, user_id)
