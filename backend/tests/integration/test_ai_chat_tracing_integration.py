"""Integration tests: the authenticated /chat endpoint records an AI trace."""

from __future__ import annotations

import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
import sqlalchemy as sa
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker

from app.ai.models import AiFeature, AiTrace, AiTraceStatus
from app.domains.ai.router import chat
from app.domains.ai.schemas import ChatRequest

pytestmark = pytest.mark.integration


def _mock_llm(reply: str = "Halo!") -> MagicMock:
    llm = MagicMock()
    llm.model = "meta-llama/llama-3.3-70b-instruct"
    llm.chat_with_tools = AsyncMock(return_value=(reply, []))
    return llm


async def test_chat_records_success_trace(
    client: AsyncClient, db_session: AsyncSession, test_user_id: uuid.UUID
) -> None:
    llm = _mock_llm("Halo, ada yang bisa dibantu?")

    with patch("app.domains.ai.router.OpenRouterLLM", return_value=llm):
        response = await client.post("/api/v1/ai/chat", json={"message": "halo"})

    assert response.status_code == 200
    session_id = uuid.UUID(response.json()["data"]["session_id"])

    trace = (
        await db_session.execute(
            sa.select(AiTrace).where(AiTrace.linked_entity_id == session_id)
        )
    ).scalar_one()
    assert trace.feature == AiFeature.chat
    assert trace.status == AiTraceStatus.success
    assert trace.user_id == test_user_id
    assert trace.model == "meta-llama/llama-3.3-70b-instruct"
    assert trace.linked_entity_type == "chat_session"


async def test_chat_records_error_trace_on_llm_failure(
    db_engine: AsyncEngine,
    db_session: AsyncSession,
    test_user_id: uuid.UUID,
) -> None:
    """Calls the route function directly -- going through the full ASGI/HTTP
    stack here fights the app's logging middleware over who re-raises the
    LLM's exception, which is orthogonal to what this test checks: that the
    error path records a trace before the exception is left to propagate.
    """
    llm = _mock_llm()
    llm.chat_with_tools = AsyncMock(side_effect=RuntimeError("upstream 503"))
    test_factory = async_sessionmaker(db_engine, expire_on_commit=False)

    with (
        patch("app.domains.ai.router.OpenRouterLLM", return_value=llm),
        patch("app.domains.ai.router.SessionFactory", test_factory),
        pytest.raises(RuntimeError, match="upstream 503"),
    ):
        await chat(
            body=ChatRequest(message="halo"),
            user_id=test_user_id,
            session=db_session,
        )

    trace = (
        await db_session.execute(
            sa.select(AiTrace).where(
                AiTrace.user_id == test_user_id, AiTrace.status == AiTraceStatus.error
            )
        )
    ).scalar_one()
    assert trace.feature == AiFeature.chat
    assert trace.error_message is not None
    assert "RuntimeError" in trace.error_message
