"""OpenRouter LLM provider.

OpenRouter is an OpenAI-compatible gateway to many model providers, so choosing
a different model is just a different `LLM_MODEL` value with no code change.
`instructor` handles the structured-output parsing.
"""

from __future__ import annotations

import base64
import json
from collections.abc import AsyncIterator
from typing import Any, TypeVar

import instructor
from openai import AsyncOpenAI
from pydantic import BaseModel

from app.ai.llm.base import LLMProvider
from app.core.config import Settings

T = TypeVar("T", bound=BaseModel)


def _parse_tool_arguments(raw: str) -> dict[str, Any]:
    """Parse a tool call's JSON arguments, tolerating malformed model output.

    Some models occasionally emit invalid JSON for tool arguments. Letting
    that raise would kill the entire chat turn; instead the tool executor
    receives an empty/marker dict and can respond with a normal tool-level
    error the model can recover from.
    """
    try:
        parsed = json.loads(raw)
    except (json.JSONDecodeError, TypeError):
        return {"_parse_error": "Model emitted malformed JSON arguments"}
    return parsed if isinstance(parsed, dict) else {"_parse_error": "Arguments were not an object"}

_OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"
_APP_TITLE = "voice-finance-backend"
_REQUEST_TIMEOUT_SECONDS = 58.0
_MAX_RETRIES = 0

# Low temperature keeps tool-calling and financial-figure reporting
# deterministic; this is not a creative-writing use case.
_CHAT_TEMPERATURE = 0.3


class OpenRouterLLM(LLMProvider):
    """LLM provider backed by OpenRouter (any OpenAI-compatible model)."""

    def __init__(
        self, settings: Settings, *, model: str | None = None, max_tokens: int = 1024
    ) -> None:
        self._raw_client = AsyncOpenAI(
            api_key=settings.openrouter_api_key,
            base_url=_OPENROUTER_BASE_URL,
            default_headers={"X-Title": _APP_TITLE},
            timeout=_REQUEST_TIMEOUT_SECONDS,
            max_retries=_MAX_RETRIES,
        )
        self._client = instructor.from_openai(self._raw_client, mode=instructor.Mode.JSON)
        self._model = model if model is not None else settings.llm_model
        self._max_tokens = max_tokens

    @property
    def model(self) -> str:
        """The model name this instance calls (for logging/tracing, not calls)."""
        return self._model

    async def extract(self, system_prompt: str, user_content: str, response_model: type[T]) -> T:
        result: T = await self._client.chat.completions.create(
            model=self._model,
            response_model=response_model,
            max_tokens=self._max_tokens,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_content},
            ],
        )
        return result

    async def extract_from_image(
        self,
        system_prompt: str,
        image_bytes: bytes,
        image_media_type: str,
        response_model: type[T],
    ) -> T:
        b64 = base64.b64encode(image_bytes).decode()
        result: T = await self._client.chat.completions.create(
            model=self._model,
            response_model=response_model,
            max_tokens=self._max_tokens,
            messages=[
                {"role": "system", "content": system_prompt},
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:{image_media_type};base64,{b64}",
                            },
                        },
                        {"type": "text", "text": "Extract the transaction from this receipt."},
                    ],
                },
            ],
        )
        return result

    async def chat(self, system_prompt: str, user_message: str) -> str:
        completion = await self._raw_client.chat.completions.create(
            model=self._model,
            max_tokens=self._max_tokens,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message},
            ],
        )
        return completion.choices[0].message.content or ""

    async def stream_chat(self, system_prompt: str, user_message: str) -> AsyncIterator[str]:
        stream = await self._raw_client.chat.completions.create(
            model=self._model,
            max_tokens=self._max_tokens,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message},
            ],
            stream=True,
        )
        async for chunk in stream:
            token = chunk.choices[0].delta.content
            if token:
                yield token

    async def chat_with_tools(
        self,
        system_prompt: str,
        messages: list[dict[str, Any]],
        tools: list[dict[str, Any]],
        *,
        force_text: bool = False,
        require_tool: bool = False,
    ) -> tuple[str, list[dict[str, Any]]]:
        if force_text:
            tool_choice = "none"
        elif require_tool:
            tool_choice = "required"
        else:
            tool_choice = "auto"
        completion = await self._raw_client.chat.completions.create(  # type: ignore[call-overload]
            model=self._model,
            max_tokens=self._max_tokens,
            temperature=_CHAT_TEMPERATURE,
            messages=[{"role": "system", "content": system_prompt}, *messages],
            tools=tools,
            tool_choice=tool_choice,
        )
        msg = completion.choices[0].message
        if msg.tool_calls:
            tool_calls = [
                {
                    "id": tc.id,
                    "type": "function",
                    "name": tc.function.name,
                    "arguments": _parse_tool_arguments(tc.function.arguments),
                }
                for tc in msg.tool_calls
            ]
            return "", tool_calls
        return msg.content or "", []
