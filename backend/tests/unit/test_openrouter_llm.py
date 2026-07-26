"""Unit tests for the OpenRouter LLM provider's tool-calling behavior."""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock

import pytest

from app.ai.llm.openrouter import (
    _CHAT_TEMPERATURE,
    _MAX_RETRIES,
    _REQUEST_TIMEOUT_SECONDS,
    OpenRouterLLM,
)


def _make_llm() -> OpenRouterLLM:
    settings = MagicMock()
    settings.openrouter_api_key = "test-key"
    settings.llm_model = "test-model"
    return OpenRouterLLM(settings)


def _make_completion(*, content: str | None, tool_calls: list[MagicMock] | None) -> MagicMock:
    message = MagicMock()
    message.content = content
    message.tool_calls = tool_calls
    completion = MagicMock()
    completion.choices = [MagicMock(message=message)]
    return completion


def _make_tool_call(name: str, arguments: str, call_id: str = "call_1") -> MagicMock:
    tc = MagicMock()
    tc.id = call_id
    tc.function.name = name
    tc.function.arguments = arguments
    return tc


@pytest.mark.asyncio
async def test_chat_with_tools_handles_malformed_json_arguments() -> None:
    """A model that emits invalid JSON in tool_call.arguments must not crash
    the turn — the malformed args are surfaced so execute_tool can respond
    with a graceful error instead of raising."""
    llm = _make_llm()
    tool_call = _make_tool_call("create_transaction", "{not valid json")
    llm._raw_client.chat.completions.create = AsyncMock(
        return_value=_make_completion(content=None, tool_calls=[tool_call])
    )

    _, tool_calls = await llm.chat_with_tools("system", [], [])

    assert len(tool_calls) == 1
    assert tool_calls[0]["name"] == "create_transaction"
    assert isinstance(tool_calls[0]["arguments"], dict)


@pytest.mark.asyncio
async def test_chat_with_tools_still_parses_valid_json_arguments() -> None:
    llm = _make_llm()
    tool_call = _make_tool_call("get_recent_transactions", '{"limit": 5}')
    llm._raw_client.chat.completions.create = AsyncMock(
        return_value=_make_completion(content=None, tool_calls=[tool_call])
    )

    _, tool_calls = await llm.chat_with_tools("system", [], [])

    assert tool_calls[0]["arguments"] == {"limit": 5}


@pytest.mark.asyncio
async def test_chat_with_tools_uses_low_temperature_for_determinism() -> None:
    llm = _make_llm()
    create_mock = AsyncMock(
        return_value=_make_completion(content="hi", tool_calls=None)
    )
    llm._raw_client.chat.completions.create = create_mock

    await llm.chat_with_tools("system", [], [])

    _, kwargs = create_mock.call_args
    assert kwargs["temperature"] == _CHAT_TEMPERATURE


@pytest.mark.asyncio
async def test_chat_with_tools_force_text_disables_tool_choice() -> None:
    llm = _make_llm()
    create_mock = AsyncMock(
        return_value=_make_completion(content="Kamu punya Rp 1.000.000.", tool_calls=None)
    )
    llm._raw_client.chat.completions.create = create_mock

    content, tool_calls = await llm.chat_with_tools("system", [], [], force_text=True)

    _, kwargs = create_mock.call_args
    assert kwargs["tool_choice"] == "none"
    assert content == "Kamu punya Rp 1.000.000."
    assert tool_calls == []


def test_client_disables_sdk_retries_to_avoid_timeout_multiplication() -> None:
    assert _MAX_RETRIES == 0


def test_client_request_timeout_leaves_room_under_the_60s_job_deadline() -> None:
    assert _REQUEST_TIMEOUT_SECONDS < 60


@pytest.mark.asyncio
async def test_chat_with_tools_require_tool_sets_tool_choice_required() -> None:
    llm = _make_llm()
    tool_call = _make_tool_call("get_accounts", "{}")
    create_mock = AsyncMock(return_value=_make_completion(content=None, tool_calls=[tool_call]))
    llm._raw_client.chat.completions.create = create_mock

    await llm.chat_with_tools("system", [], [], require_tool=True)

    _, kwargs = create_mock.call_args
    assert kwargs["tool_choice"] == "required"
