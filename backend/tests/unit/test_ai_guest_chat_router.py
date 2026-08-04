"""Unit tests for the anonymous guest chat endpoint (LLM + DB mocked)."""

from __future__ import annotations

import json
import uuid
from unittest.mock import AsyncMock, MagicMock, patch

from app.domains.ai.router import _GUEST_AI_LIFETIME_LIMIT, guest_chat
from app.domains.ai.schemas import GuestAccountSnapshot, GuestChatHistoryItem, GuestChatRequest
from app.domains.finance.models import CategoryType

_ACC_ID = uuid.uuid4()


def _account() -> GuestAccountSnapshot:
    return GuestAccountSnapshot(id=_ACC_ID, name="Dompet", balance=500_000, currency="IDR")


def _tool_call(name: str, arguments: dict | None = None) -> dict:
    return {"id": f"call_{uuid.uuid4().hex[:8]}", "name": name, "arguments": arguments or {}}


def _draft_result(merchant: str, amount: int) -> str:
    return json.dumps(
        {
            "transaction_id": str(uuid.uuid4()),
            "amount": amount,
            "currency": "IDR",
            "merchant": merchant,
            "category_name": "Makan",
            "note": None,
            "account_id": str(_ACC_ID),
            "status": "draft",
            "created_at": "2026-01-01T00:00:00+00:00",
        }
    )


def _category(name: str, type_: CategoryType) -> MagicMock:
    cat = MagicMock()
    cat.name = name
    cat.type = type_
    return cat


async def test_guest_chat_creates_draft_transaction() -> None:
    llm = MagicMock()
    llm.chat_with_tools = AsyncMock(
        side_effect=[
            ("", [_tool_call("get_accounts")]),
            ("", [_tool_call("create_transaction", {"amount": -20000})]),
            ("", []),
        ]
    )
    execute_guest_tool = AsyncMock(
        side_effect=[json.dumps({"accounts": []}), _draft_result("Sate", -20000)]
    )

    with (
        patch("app.domains.ai.router.OpenRouterLLM", return_value=llm),
        patch("app.domains.ai.router.get_settings", return_value=MagicMock()),
        patch("app.domains.ai.router.increment_counter", AsyncMock(return_value=1)),
        patch(
            "app.domains.ai.router.finance_repo.list_system_categories",
            AsyncMock(return_value=[]),
        ),
        patch("app.domains.ai.router.execute_guest_tool", execute_guest_tool),
    ):
        response = await guest_chat(
            GuestChatRequest(message="sate 20.000", accounts=[_account()]),
            AsyncMock(),
            str(uuid.uuid4()),
        )

    assert len(response.data.draft_transactions) == 1
    assert response.data.draft_transactions[0].merchant == "Sate"
    assert response.data.reply == ""


async def test_guest_chat_returns_remaining_quota_from_counter() -> None:
    llm = MagicMock()
    llm.chat_with_tools = AsyncMock(return_value=("Halo!", []))

    with (
        patch("app.domains.ai.router.OpenRouterLLM", return_value=llm),
        patch("app.domains.ai.router.get_settings", return_value=MagicMock()),
        patch("app.domains.ai.router.increment_counter", AsyncMock(return_value=2)),
        patch(
            "app.domains.ai.router.finance_repo.list_system_categories",
            AsyncMock(return_value=[]),
        ),
    ):
        response = await guest_chat(
            GuestChatRequest(message="halo", accounts=[]), AsyncMock(), str(uuid.uuid4())
        )

    assert response.data.remaining_quota == _GUEST_AI_LIFETIME_LIMIT - 2


async def test_guest_chat_rejects_invalid_device_id_header() -> None:
    llm = MagicMock()
    with patch("app.domains.ai.router.OpenRouterLLM", return_value=llm):
        try:
            await guest_chat(
                GuestChatRequest(message="halo", accounts=[]), AsyncMock(), "not-a-uuid"
            )
        except Exception as exc:
            assert getattr(exc, "status_code", None) == 400
        else:
            raise AssertionError("expected BadRequestError for malformed device id")


async def test_guest_chat_replays_client_supplied_history() -> None:
    llm = MagicMock()
    llm.chat_with_tools = AsyncMock(return_value=("Oke!", []))

    with (
        patch("app.domains.ai.router.OpenRouterLLM", return_value=llm),
        patch("app.domains.ai.router.get_settings", return_value=MagicMock()),
        patch("app.domains.ai.router.increment_counter", AsyncMock(return_value=1)),
        patch(
            "app.domains.ai.router.finance_repo.list_system_categories",
            AsyncMock(return_value=[]),
        ),
    ):
        await guest_chat(
            GuestChatRequest(
                message="makasih",
                accounts=[],
                history=[
                    GuestChatHistoryItem(role="user", content="sate 20.000"),
                    GuestChatHistoryItem(role="assistant", content=""),
                ],
            ),
            AsyncMock(),
            str(uuid.uuid4()),
        )

    sent_messages = llm.chat_with_tools.call_args_list[0].args[1]
    assert any(m["content"] == "sate 20.000" for m in sent_messages)


async def test_guest_chat_never_touches_authenticated_repo_or_session_persistence() -> None:
    """A guest turn must never call the authenticated ai.repository (no
    chat_sessions/chat_messages row should ever be written for a guest)."""
    llm = MagicMock()
    llm.chat_with_tools = AsyncMock(return_value=("Halo!", []))
    repo_mock = MagicMock()
    repo_mock.add_message = AsyncMock()

    with (
        patch("app.domains.ai.router.OpenRouterLLM", return_value=llm),
        patch("app.domains.ai.router.get_settings", return_value=MagicMock()),
        patch("app.domains.ai.router.increment_counter", AsyncMock(return_value=1)),
        patch(
            "app.domains.ai.router.finance_repo.list_system_categories",
            AsyncMock(return_value=[]),
        ),
        patch("app.domains.ai.router.repo", repo_mock),
    ):
        await guest_chat(
            GuestChatRequest(message="halo", accounts=[]), AsyncMock(), str(uuid.uuid4())
        )

    repo_mock.add_message.assert_not_called()


async def test_guest_chat_system_prompt_lists_system_categories() -> None:
    llm = MagicMock()
    llm.chat_with_tools = AsyncMock(return_value=("Halo!", []))

    with (
        patch("app.domains.ai.router.OpenRouterLLM", return_value=llm),
        patch("app.domains.ai.router.get_settings", return_value=MagicMock()),
        patch("app.domains.ai.router.increment_counter", AsyncMock(return_value=1)),
        patch(
            "app.domains.ai.router.finance_repo.list_system_categories",
            AsyncMock(return_value=[_category("Makan & Jajan", CategoryType.expense)]),
        ),
    ):
        await guest_chat(
            GuestChatRequest(message="makan 30k", accounts=[]), AsyncMock(), str(uuid.uuid4())
        )

    system_prompt = llm.chat_with_tools.call_args_list[0].args[0]
    assert "Makan & Jajan" in system_prompt


async def test_guest_chat_uses_only_guest_tools() -> None:
    llm = MagicMock()
    llm.chat_with_tools = AsyncMock(return_value=("Halo!", []))

    with (
        patch("app.domains.ai.router.OpenRouterLLM", return_value=llm),
        patch("app.domains.ai.router.get_settings", return_value=MagicMock()),
        patch("app.domains.ai.router.increment_counter", AsyncMock(return_value=1)),
        patch(
            "app.domains.ai.router.finance_repo.list_system_categories",
            AsyncMock(return_value=[]),
        ),
    ):
        await guest_chat(
            GuestChatRequest(message="halo", accounts=[]), AsyncMock(), str(uuid.uuid4())
        )

    tools_arg = llm.chat_with_tools.call_args_list[0].args[2]
    tool_names = {t["function"]["name"] for t in tools_arg}
    assert tool_names == {"get_accounts", "create_transaction"}
