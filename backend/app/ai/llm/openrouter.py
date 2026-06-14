"""OpenRouter LLM provider.

OpenRouter is an OpenAI-compatible gateway to many model providers, so choosing
a different model is just a different `LLM_MODEL` value with no code change.
`instructor` handles the structured-output parsing.
"""

from __future__ import annotations

import base64
from collections.abc import AsyncIterator
from typing import TypeVar

import instructor
from openai import AsyncOpenAI
from pydantic import BaseModel

from app.ai.llm.base import LLMProvider
from app.core.config import Settings

T = TypeVar("T", bound=BaseModel)

_OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"
_APP_TITLE = "voice-finance-backend"


class OpenRouterLLM(LLMProvider):
    """LLM provider backed by OpenRouter (any OpenAI-compatible model)."""

    def __init__(self, settings: Settings, *, model: str | None = None) -> None:
        self._raw_client = AsyncOpenAI(
            api_key=settings.openrouter_api_key,
            base_url=_OPENROUTER_BASE_URL,
            default_headers={"X-Title": _APP_TITLE},
        )
        self._client = instructor.from_openai(self._raw_client, mode=instructor.Mode.JSON)
        self._model = model if model is not None else settings.llm_model

    async def extract(
        self, system_prompt: str, user_content: str, response_model: type[T]
    ) -> T:
        result: T = await self._client.chat.completions.create(
            model=self._model,
            response_model=response_model,
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
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message},
            ],
        )
        return completion.choices[0].message.content or ""

    async def stream_chat(self, system_prompt: str, user_message: str) -> AsyncIterator[str]:
        stream = await self._raw_client.chat.completions.create(
            model=self._model,
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
