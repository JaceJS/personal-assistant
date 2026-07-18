"""Unit tests for the AI chat endpoint's draft transaction collection (LLM mocked)."""

from __future__ import annotations

import json
import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.domains.ai.router import _count_amount_mentions, chat
from app.domains.ai.schemas import ChatRequest
from app.domains.finance.models import CategoryType

_USER_ID = uuid.uuid4()
_SESSION_ID = uuid.uuid4()
_ACCOUNT_ID = uuid.uuid4()


def _pending_draft(merchant: str, amount: int) -> MagicMock:
    tx = MagicMock()
    tx.merchant = merchant
    tx.amount = amount
    return tx


def _history_message(role: str, content: str) -> MagicMock:
    msg = MagicMock()
    msg.role = role
    msg.content = content
    return msg


def _category(name: str, type_: CategoryType) -> MagicMock:
    cat = MagicMock()
    cat.name = name
    cat.type = type_
    return cat


@pytest.fixture(autouse=True)
def _no_pending_drafts_by_default():
    """Most tests don't care about the same-session-duplicate-guard query or
    the category-list prompt injection; default both to empty so they're
    no-ops unless a test opts in."""
    with patch(
        "app.domains.ai.router.finance_repo",
        MagicMock(
            get_pending_draft_transactions=AsyncMock(return_value=[]),
            list_categories=AsyncMock(return_value=[]),
            list_system_categories=AsyncMock(return_value=[]),
        ),
    ) as mock_finance_repo:
        yield mock_finance_repo


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
    repo_mock = _mock_repo()

    with (
        patch("app.domains.ai.router.OpenRouterLLM", return_value=llm),
        patch("app.domains.ai.router.get_settings", return_value=MagicMock()),
        patch("app.domains.ai.router.repo", repo_mock),
        patch("app.domains.ai.router.execute_tool", execute_tool),
    ):
        response = await chat(
            ChatRequest(message="sate 20.000 es teh 5.000"), _USER_ID, AsyncMock()
        )

    drafts = response.data.draft_transactions
    assert len(drafts) == 2
    assert [d.merchant for d in drafts] == ["Sate", "Es Teh"]
    assert [d.amount for d in drafts] == [-20000, -5000]
    assert response.data.reply == ""
    persisted_content = repo_mock.add_message.call_args.args[-1]
    assert persisted_content == ""


@pytest.mark.asyncio
async def test_chat_reminds_model_of_pending_drafts_to_avoid_duplicate_recording() -> None:
    """Regression guard: once the assistant's reply is suppressed to "" after a
    successful create_transaction (see the "no filler text" fix), the model has
    no textual record in chat history that it already recorded an earlier item —
    it will otherwise re-create it alongside a new one on the very next message.
    The reminder is built fresh from the DB each turn, so a draft the user
    cancelled (deleted) in between naturally drops out and is never re-mentioned.

    Folded into the leading system prompt rather than a mid-conversation system
    message: empirically the model complies with the former far more reliably —
    a system-role message buried between tool turns gets ignored in practice."""
    llm = MagicMock()
    llm.chat_with_tools = AsyncMock(return_value=("Halo!", []))
    finance_repo_mock = MagicMock(
        get_pending_draft_transactions=AsyncMock(
            return_value=[_pending_draft("sate", -20000)]
        ),
        list_categories=AsyncMock(return_value=[]),
        list_system_categories=AsyncMock(return_value=[]),
    )

    with (
        patch("app.domains.ai.router.OpenRouterLLM", return_value=llm),
        patch("app.domains.ai.router.get_settings", return_value=MagicMock()),
        patch("app.domains.ai.router.repo", _mock_repo()),
        patch("app.domains.ai.router.finance_repo", finance_repo_mock),
    ):
        await chat(ChatRequest(message="kopi 15rb", session_id=_SESSION_ID), _USER_ID, AsyncMock())

    first_call_system_prompt = llm.chat_with_tools.call_args_list[0].args[0]
    assert "sate" in first_call_system_prompt


@pytest.mark.asyncio
async def test_chat_replaces_empty_assistant_turns_in_history_with_a_placeholder() -> None:
    """Regression guard, found by live-testing against the real model: an empty
    assistant turn verbatim in the replayed history reads to the model as "I
    never actually did anything for that request" — it then re-attempts the
    earlier item's create_transaction call on the *next* message, even with the
    system-prompt reminder in place (confirmed: the reminder alone was not
    enough — the model weighs the literal conversation content over it). A
    non-empty placeholder closes that gap. This never touches what's persisted
    to chat_messages or shown in the UI — it's substituted only in the ephemeral
    list sent to the LLM for this turn."""
    llm = MagicMock()
    llm.chat_with_tools = AsyncMock(return_value=("Halo!", []))
    repo_mock = _mock_repo()
    repo_mock.get_recent_messages = AsyncMock(
        return_value=[
            _history_message("user", "sate 20.000"),
            _history_message("assistant", ""),
        ]
    )

    with (
        patch("app.domains.ai.router.OpenRouterLLM", return_value=llm),
        patch("app.domains.ai.router.get_settings", return_value=MagicMock()),
        patch("app.domains.ai.router.repo", repo_mock),
    ):
        await chat(ChatRequest(message="kopi 15rb", session_id=_SESSION_ID), _USER_ID, AsyncMock())

    first_call_messages = llm.chat_with_tools.call_args_list[0].args[1]
    replayed_assistant_turn = next(m for m in first_call_messages if m["role"] == "assistant")
    assert replayed_assistant_turn["content"] != ""


@pytest.mark.asyncio
async def test_chat_skips_reminder_when_no_pending_drafts() -> None:
    llm = MagicMock()
    llm.chat_with_tools = AsyncMock(return_value=("Halo!", []))

    with (
        patch("app.domains.ai.router.OpenRouterLLM", return_value=llm),
        patch("app.domains.ai.router.get_settings", return_value=MagicMock()),
        patch("app.domains.ai.router.repo", _mock_repo()),
    ):
        await chat(ChatRequest(message="halo"), _USER_ID, AsyncMock())

    first_call_system_prompt = llm.chat_with_tools.call_args_list[0].args[0]
    assert "already recorded" not in first_call_system_prompt


@pytest.mark.parametrize(
    ("message", "expected"),
    [
        ("", 0),
        ("Catat pengeluaran", 0),
        ("sate 20.000", 1),
        ("sate 20.000 es teh 5.000", 2),
        ("kopi 15rb", 1),
    ],
)
def test_count_amount_mentions(message: str, expected: int) -> None:
    assert _count_amount_mentions(message) == expected


@pytest.mark.asyncio
async def test_chat_blocks_create_transaction_when_message_has_no_amount() -> None:
    """A vague message like "catat pengeluaran" has zero amount mentions, so
    create_transaction must be blocked in code even if the model calls it
    anyway — the prompt guardrail alone isn't reliable enough (the model is
    also forced into a tool call on iterations 0-1, see require_tool)."""
    llm = MagicMock()
    llm.chat_with_tools = AsyncMock(
        side_effect=[
            ("", [_tool_call("create_transaction", {"amount": -15000, "merchant": "Jajan"})]),
            ("", [_tool_call("create_transaction", {"amount": -20000, "merchant": "Belanja"})]),
            ("Catat pengeluaran apa dan berapa?", []),
        ]
    )
    execute_tool = AsyncMock()

    with (
        patch("app.domains.ai.router.OpenRouterLLM", return_value=llm),
        patch("app.domains.ai.router.get_settings", return_value=MagicMock()),
        patch("app.domains.ai.router.repo", _mock_repo()),
        patch("app.domains.ai.router.execute_tool", execute_tool),
    ):
        response = await chat(ChatRequest(message="catat pengeluaran"), _USER_ID, AsyncMock())

    assert response.data.draft_transactions == []
    execute_tool.assert_not_called()


@pytest.mark.asyncio
async def test_chat_caps_create_transaction_at_the_amounts_the_user_mentioned() -> None:
    """One amount in the message means at most one draft, even if the model
    hedges with a second guessed create_transaction call."""
    llm = MagicMock()
    llm.chat_with_tools = AsyncMock(
        side_effect=[
            (
                "",
                [
                    _tool_call("create_transaction", {"amount": -20000, "merchant": "Sate"}),
                    _tool_call("create_transaction", {"amount": -21000, "merchant": "Sate 2"}),
                ],
            ),
            ("", []),
        ]
    )
    execute_tool = AsyncMock(side_effect=[_draft_result("Sate", -20000)])

    with (
        patch("app.domains.ai.router.OpenRouterLLM", return_value=llm),
        patch("app.domains.ai.router.get_settings", return_value=MagicMock()),
        patch("app.domains.ai.router.repo", _mock_repo()),
        patch("app.domains.ai.router.execute_tool", execute_tool),
    ):
        response = await chat(ChatRequest(message="sate 20.000"), _USER_ID, AsyncMock())

    assert len(response.data.draft_transactions) == 1
    execute_tool.assert_called_once()


@pytest.mark.asyncio
async def test_chat_system_prompt_forbids_guessing_transaction_details() -> None:
    """Regression guard: a bare command like "Catat pengeluaran" (no item or
    amount) was fabricating a draft transaction, because the generic 'try
    tools with sensible defaults before asking' behavior rule doesn't carve
    out create_transaction — which has no sensible default for a missing
    item/amount, unlike e.g. defaulting to the current month or all accounts.
    The leading system prompt must explicitly forbid guessing here, since the
    model complies with the leading system prompt far more reliably than a
    later or generic instruction (see other regression guards in this file)."""
    llm = MagicMock()
    llm.chat_with_tools = AsyncMock(return_value=("Catat pengeluaran apa dan berapa?", []))

    with (
        patch("app.domains.ai.router.OpenRouterLLM", return_value=llm),
        patch("app.domains.ai.router.get_settings", return_value=MagicMock()),
        patch("app.domains.ai.router.repo", _mock_repo()),
    ):
        await chat(ChatRequest(message="Catat pengeluaran"), _USER_ID, AsyncMock())

    system_prompt = llm.chat_with_tools.call_args_list[0].args[0]
    assert "do not call create_transaction" in system_prompt.lower()


@pytest.mark.asyncio
async def test_chat_system_prompt_treats_merchant_as_optional() -> None:
    """Regression guard: merchant isn't required by the tool schema, but the
    prompt used to instruct the model to always derive one ("use the item
    name as merchant"), and the card then rendered that guess as the
    headline. The prompt must frame category, not merchant, as the primary
    signal, and say merchant is optional."""
    llm = MagicMock()
    llm.chat_with_tools = AsyncMock(return_value=("Halo!", []))

    with (
        patch("app.domains.ai.router.OpenRouterLLM", return_value=llm),
        patch("app.domains.ai.router.get_settings", return_value=MagicMock()),
        patch("app.domains.ai.router.repo", _mock_repo()),
    ):
        await chat(ChatRequest(message="halo"), _USER_ID, AsyncMock())

    system_prompt = llm.chat_with_tools.call_args_list[0].args[0]
    assert "merchant is optional" in system_prompt.lower()


@pytest.mark.asyncio
async def test_chat_requires_a_tool_call_on_the_first_two_iterations() -> None:
    """tool_choice="auto" lets the model skip tool-calling entirely and answer
    straight from the system prompt's script (e.g. claim a transaction was
    recorded with zero grounding). Forcing iteration 0 alone wasn't enough in
    practice: the model would call get_accounts (satisfying that requirement),
    then bail to freeform text on iteration 1 without ever calling
    create_transaction — draft_transactions stayed empty so the false
    confirmation text passed straight through. Forcing iterations 0 *and* 1
    closes that gap; iteration 2 onward stays "auto" so the model can still
    end the turn with plain text once it has real data."""
    llm = MagicMock()
    llm.chat_with_tools = AsyncMock(
        side_effect=[
            ("", [_tool_call("get_accounts")]),
            ("", [_tool_call("create_transaction", {"amount": -20000})]),
            ("", []),
        ]
    )
    execute_tool = AsyncMock(
        side_effect=[json.dumps({"accounts": []}), _draft_result("sate", -20000)]
    )

    with (
        patch("app.domains.ai.router.OpenRouterLLM", return_value=llm),
        patch("app.domains.ai.router.get_settings", return_value=MagicMock()),
        patch("app.domains.ai.router.repo", _mock_repo()),
        patch("app.domains.ai.router.execute_tool", execute_tool),
    ):
        await chat(ChatRequest(message="sate 20.000"), _USER_ID, AsyncMock())

    calls = llm.chat_with_tools.call_args_list
    assert calls[0].kwargs.get("require_tool") is True
    assert calls[1].kwargs.get("require_tool") is True
    assert calls[2].kwargs.get("require_tool") is not True


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


@pytest.mark.asyncio
async def test_chat_forces_text_reply_when_tool_loop_exhausts_without_content() -> None:
    """If the model keeps calling tools for all loop iterations, content is
    always "" (per chat_with_tools contract). Without a fallback, the empty
    reply gets shown to the user and persisted to history — this asserts the
    router forces one more tool-free completion instead."""
    llm = MagicMock()
    llm.chat_with_tools = AsyncMock(
        side_effect=[
            ("", [_tool_call("get_accounts")]),
            ("", [_tool_call("get_accounts")]),
            ("", [_tool_call("get_accounts")]),
            ("", [_tool_call("get_accounts")]),
            ("", [_tool_call("get_accounts")]),
            ("Kamu punya 1 akun dengan saldo Rp 1.000.000.", []),
        ]
    )
    execute_tool = AsyncMock(return_value=json.dumps({"accounts": []}))
    repo_mock = _mock_repo()

    with (
        patch("app.domains.ai.router.OpenRouterLLM", return_value=llm),
        patch("app.domains.ai.router.get_settings", return_value=MagicMock()),
        patch("app.domains.ai.router.repo", repo_mock),
        patch("app.domains.ai.router.execute_tool", execute_tool),
    ):
        response = await chat(ChatRequest(message="saldo aku berapa?"), _USER_ID, AsyncMock())

    assert response.data.reply == "Kamu punya 1 akun dengan saldo Rp 1.000.000."
    assert llm.chat_with_tools.call_count == 6
    forced_call = llm.chat_with_tools.call_args_list[-1]
    assert forced_call.kwargs.get("force_text") is True
    assert "never claim success" in forced_call.args[0].lower()
    persisted_content = repo_mock.add_message.call_args.args[-1]
    assert persisted_content == response.data.reply


@pytest.mark.asyncio
async def test_chat_suppresses_reply_text_when_drafts_created_even_if_model_wrote_something() -> (
    None
):
    llm = MagicMock()
    llm.chat_with_tools = AsyncMock(
        side_effect=[
            ("", [_tool_call("get_accounts")]),
            ("", [_tool_call("create_transaction", {"amount": -20000})]),
            ("Oke, aku catatkan ya!", []),
        ]
    )
    execute_tool = AsyncMock(
        side_effect=[json.dumps({"accounts": []}), _draft_result("Sate", -20000)]
    )
    repo_mock = _mock_repo()

    with (
        patch("app.domains.ai.router.OpenRouterLLM", return_value=llm),
        patch("app.domains.ai.router.get_settings", return_value=MagicMock()),
        patch("app.domains.ai.router.repo", repo_mock),
        patch("app.domains.ai.router.execute_tool", execute_tool),
    ):
        response = await chat(ChatRequest(message="sate 20.000"), _USER_ID, AsyncMock())

    assert len(response.data.draft_transactions) == 1
    assert response.data.reply == ""
    assert llm.chat_with_tools.call_count == 3


@pytest.mark.asyncio
async def test_chat_uses_fallback_reply_when_forced_completion_still_empty() -> None:
    """Even the forced text-only completion can come back empty (upstream
    hiccup). The user must never see a blank bubble, and an empty string must
    never be persisted to chat history."""
    llm = MagicMock()
    llm.chat_with_tools = AsyncMock(side_effect=[("", []), ("", [])])
    repo_mock = _mock_repo()

    with (
        patch("app.domains.ai.router.OpenRouterLLM", return_value=llm),
        patch("app.domains.ai.router.get_settings", return_value=MagicMock()),
        patch("app.domains.ai.router.repo", repo_mock),
    ):
        response = await chat(ChatRequest(message="halo"), _USER_ID, AsyncMock())

    assert response.data.reply != ""
    assert llm.chat_with_tools.call_count == 2
    persisted_content = repo_mock.add_message.call_args.args[-1]
    assert persisted_content == response.data.reply


@pytest.mark.asyncio
async def test_chat_system_prompt_lists_user_categories() -> None:
    """The model can only pick a correct category_name if it knows the user's
    actual category names — without the list it guesses ('Makan') and the
    backend's ilike match silently fails against the real name."""
    llm = MagicMock()
    llm.chat_with_tools = AsyncMock(return_value=("Halo!", []))
    finance_repo_mock = MagicMock(
        get_pending_draft_transactions=AsyncMock(return_value=[]),
        list_categories=AsyncMock(
            return_value=[
                _category("Makan & Jajan", CategoryType.expense),
                _category("Ojek & Transport", CategoryType.expense),
                _category("Gaji", CategoryType.income),
            ]
        ),
        list_system_categories=AsyncMock(return_value=[]),
    )

    with (
        patch("app.domains.ai.router.OpenRouterLLM", return_value=llm),
        patch("app.domains.ai.router.get_settings", return_value=MagicMock()),
        patch("app.domains.ai.router.repo", _mock_repo()),
        patch("app.domains.ai.router.finance_repo", finance_repo_mock),
    ):
        await chat(ChatRequest(message="makan 30k", session_id=_SESSION_ID), _USER_ID, AsyncMock())

    system_prompt = llm.chat_with_tools.call_args_list[0].args[0]
    assert "Makan & Jajan" in system_prompt
    assert "Ojek & Transport" in system_prompt
    assert "Gaji" in system_prompt


@pytest.mark.asyncio
async def test_chat_system_prompt_falls_back_to_system_categories() -> None:
    """A brand-new user who chats before any screen triggered the per-user
    category seeding still gets the system defaults listed in the prompt."""
    llm = MagicMock()
    llm.chat_with_tools = AsyncMock(return_value=("Halo!", []))
    finance_repo_mock = MagicMock(
        get_pending_draft_transactions=AsyncMock(return_value=[]),
        list_categories=AsyncMock(return_value=[]),
        list_system_categories=AsyncMock(
            return_value=[_category("Makan & Jajan", CategoryType.expense)]
        ),
    )

    with (
        patch("app.domains.ai.router.OpenRouterLLM", return_value=llm),
        patch("app.domains.ai.router.get_settings", return_value=MagicMock()),
        patch("app.domains.ai.router.repo", _mock_repo()),
        patch("app.domains.ai.router.finance_repo", finance_repo_mock),
    ):
        await chat(ChatRequest(message="makan 30k", session_id=_SESSION_ID), _USER_ID, AsyncMock())

    system_prompt = llm.chat_with_tools.call_args_list[0].args[0]
    assert "Makan & Jajan" in system_prompt
