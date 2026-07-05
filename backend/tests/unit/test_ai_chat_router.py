"""Unit tests for the AI chat endpoint's draft transaction collection (LLM mocked)."""

from __future__ import annotations

import json
import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.domains.ai.router import chat
from app.domains.ai.schemas import ChatRequest

_USER_ID = uuid.uuid4()
_SESSION_ID = uuid.uuid4()
_ACCOUNT_ID = uuid.uuid4()


def _draft_result(merchant: str, amount: int) -> str:
    return json.dumps(
        {
            "transaction_id": str(uuid.uuid4()),
            "amount": amount,
            "currency": "IDR",
            "merchant": merchant,
            "category_name": "Makan",
            "note": None,
            "account_id": str(_ACCOUNT_ID),
        }
    )


def _tool_call(name: str, arguments: dict | None = None) -> dict:
    return {"id": f"call_{uuid.uuid4().hex[:8]}", "name": name, "arguments": arguments or {}}


def _mock_repo() -> MagicMock:
    repo = MagicMock()
    chat_session = MagicMock()
    chat_session.id = _SESSION_ID
    repo.get_or_create_session = AsyncMock(return_value=chat_session)
    repo.get_recent_messages = AsyncMock(return_value=[])
    repo.add_message = AsyncMock()
    return repo


@pytest.mark.asyncio
async def test_chat_collects_multiple_draft_transactions() -> None:
    llm = MagicMock()
    llm.chat_with_tools = AsyncMock(
        side_effect=[
            (
                "",
                [
                    _tool_call("create_transaction", {"amount": -20000}),
                    _tool_call("create_transaction", {"amount": -5000}),
                ],
            ),
            ("Draft dibuat, cek card di bawah ya.", []),
        ]
    )
    execute_tool = AsyncMock(
        side_effect=[_draft_result("Sate", -20000), _draft_result("Es Teh", -5000)]
    )

    with (
        patch("app.domains.ai.router.OpenRouterLLM", return_value=llm),
        patch("app.domains.ai.router.get_settings", return_value=MagicMock()),
        patch("app.domains.ai.router.repo", _mock_repo()),
        patch("app.domains.ai.router.execute_tool", execute_tool),
    ):
        response = await chat(
            ChatRequest(message="sate 20.000 es teh 5.000"), _USER_ID, AsyncMock()
        )

    drafts = response.data.draft_transactions
    assert len(drafts) == 2
    assert [d.merchant for d in drafts] == ["Sate", "Es Teh"]
    assert [d.amount for d in drafts] == [-20000, -5000]
    assert response.data.reply == "Draft dibuat, cek card di bawah ya."


@pytest.mark.asyncio
async def test_chat_without_tool_calls_returns_empty_drafts() -> None:
    llm = MagicMock()
    llm.chat_with_tools = AsyncMock(return_value=("Halo! Ada yang bisa dibantu?", []))

    with (
        patch("app.domains.ai.router.OpenRouterLLM", return_value=llm),
        patch("app.domains.ai.router.get_settings", return_value=MagicMock()),
        patch("app.domains.ai.router.repo", _mock_repo()),
    ):
        response = await chat(ChatRequest(message="halo"), _USER_ID, AsyncMock())

    assert response.data.draft_transactions == []


@pytest.mark.asyncio
async def test_chat_skips_failed_create_transaction_results() -> None:
    llm = MagicMock()
    llm.chat_with_tools = AsyncMock(
        side_effect=[
            ("", [_tool_call("create_transaction", {"amount": -20000})]),
            ("Akun tidak ditemukan.", []),
        ]
    )
    execute_tool = AsyncMock(return_value=json.dumps({"error": "Invalid or missing account_id"}))

    with (
        patch("app.domains.ai.router.OpenRouterLLM", return_value=llm),
        patch("app.domains.ai.router.get_settings", return_value=MagicMock()),
        patch("app.domains.ai.router.repo", _mock_repo()),
        patch("app.domains.ai.router.execute_tool", execute_tool),
    ):
        response = await chat(ChatRequest(message="sate 20.000"), _USER_ID, AsyncMock())

    assert response.data.draft_transactions == []
