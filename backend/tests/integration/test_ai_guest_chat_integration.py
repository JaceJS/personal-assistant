"""Integration tests: anonymous guest chat against real Postgres.

Exercises the actual increment_counter upsert (lifetime quota) and confirms
nothing is ever persisted to chat_sessions/chat_messages for a guest. The LLM
itself is mocked — these tests are about the endpoint's own side effects, not
model behavior.

Expectations are derived from _GUEST_AI_LIFETIME_LIMIT rather than a
hardcoded number, so changing the product's trial size doesn't require
rewriting these tests.
"""

from __future__ import annotations

import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
import sqlalchemy as sa
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.ai.models import ChatMessage, ChatSession
from app.domains.ai.router import _GUEST_AI_LIFETIME_LIMIT

pytestmark = pytest.mark.integration


def _mock_llm(reply: str = "Halo!") -> MagicMock:
    llm = MagicMock()
    llm.chat_with_tools = AsyncMock(return_value=(reply, []))
    return llm


async def test_guest_messages_up_to_the_limit_succeed_and_quota_counts_down(
    client: AsyncClient,
) -> None:
    device_id = str(uuid.uuid4())
    llm = _mock_llm()

    with patch("app.domains.ai.router.OpenRouterLLM", return_value=llm):
        responses = [
            await client.post(
                "/api/v1/ai/guest-chat",
                json={"message": f"halo {i}", "accounts": []},
                headers={"X-Device-Id": device_id},
            )
            for i in range(_GUEST_AI_LIFETIME_LIMIT)
        ]

    for i, response in enumerate(responses):
        assert response.status_code == 200
        assert response.json()["data"]["remaining_quota"] == _GUEST_AI_LIFETIME_LIMIT - (i + 1)


async def test_message_beyond_the_limit_from_same_device_is_rejected(
    client: AsyncClient,
) -> None:
    device_id = str(uuid.uuid4())
    llm = _mock_llm()

    with patch("app.domains.ai.router.OpenRouterLLM", return_value=llm):
        for i in range(_GUEST_AI_LIFETIME_LIMIT):
            await client.post(
                "/api/v1/ai/guest-chat",
                json={"message": f"halo {i}", "accounts": []},
                headers={"X-Device-Id": device_id},
            )
        over_limit = await client.post(
            "/api/v1/ai/guest-chat",
            json={"message": "satu lagi", "accounts": []},
            headers={"X-Device-Id": device_id},
        )

    assert over_limit.status_code == 429


async def test_different_devices_have_independent_quotas(client: AsyncClient) -> None:
    llm = _mock_llm()

    with patch("app.domains.ai.router.OpenRouterLLM", return_value=llm):
        for i in range(_GUEST_AI_LIFETIME_LIMIT - 1):
            await client.post(
                "/api/v1/ai/guest-chat",
                json={"message": f"halo {i}", "accounts": []},
                headers={"X-Device-Id": str(uuid.uuid4())},
            )
        r = await client.post(
            "/api/v1/ai/guest-chat",
            json={"message": "halo", "accounts": []},
            headers={"X-Device-Id": str(uuid.uuid4())},
        )

    assert r.status_code == 200
    assert r.json()["data"]["remaining_quota"] == _GUEST_AI_LIFETIME_LIMIT - 1


async def test_malformed_device_id_header_is_rejected(client: AsyncClient) -> None:
    llm = _mock_llm()

    with patch("app.domains.ai.router.OpenRouterLLM", return_value=llm):
        r = await client.post(
            "/api/v1/ai/guest-chat",
            json={"message": "halo", "accounts": []},
            headers={"X-Device-Id": "not-a-uuid"},
        )

    assert r.status_code == 400


async def test_missing_device_id_header_is_rejected(client: AsyncClient) -> None:
    r = await client.post("/api/v1/ai/guest-chat", json={"message": "halo", "accounts": []})

    assert r.status_code == 422


async def test_guest_chat_never_writes_chat_session_or_chat_message_rows(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    before_sessions = (
        await db_session.execute(sa.select(sa.func.count()).select_from(ChatSession))
    ).scalar_one()
    before_messages = (
        await db_session.execute(sa.select(sa.func.count()).select_from(ChatMessage))
    ).scalar_one()
    llm = _mock_llm()

    with patch("app.domains.ai.router.OpenRouterLLM", return_value=llm):
        await client.post(
            "/api/v1/ai/guest-chat",
            json={"message": "halo", "accounts": []},
            headers={"X-Device-Id": str(uuid.uuid4())},
        )

    after_sessions = (
        await db_session.execute(sa.select(sa.func.count()).select_from(ChatSession))
    ).scalar_one()
    after_messages = (
        await db_session.execute(sa.select(sa.func.count()).select_from(ChatMessage))
    ).scalar_one()
    assert after_sessions == before_sessions
    assert after_messages == before_messages
