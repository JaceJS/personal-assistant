"""OpenRouter LLM provider.

OpenRouter is an OpenAI-compatible gateway to many model providers, so choosing
a different model is just a different `LLM_MODEL` value with no code change.
`instructor` handles the structured-output parsing.
"""

from __future__ import annotations

from typing import TypeVar

import instructor
from openai import AsyncOpenAI
from pydantic import BaseModel

from app.ai.llm.base import LLMProvider
from app.core.config import Settings

T = TypeVar("T", bound=BaseModel)

_OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"
# Sent to OpenRouter purely for app attribution on its dashboard.
_APP_TITLE = "voice-finance-backend"


class OpenRouterLLM(LLMProvider):
    """LLM provider backed by OpenRouter (any OpenAI-compatible model)."""

    def __init__(self, settings: Settings) -> None:
        client = AsyncOpenAI(
            api_key=settings.openrouter_api_key,
            base_url=_OPENROUTER_BASE_URL,
            default_headers={"X-Title": _APP_TITLE},
        )
        # JSON mode keeps structured output working across most OpenRouter models.
        self._client = instructor.from_openai(client, mode=instructor.Mode.JSON)
        self._model = settings.llm_model

    async def extract(
        self, system_prompt: str, user_content: str, response_model: type[T]
    ) -> T:
        # instructor returns an instance of response_model; pin it for the type checker.
        result: T = await self._client.chat.completions.create(
            model=self._model,
            response_model=response_model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_content},
            ],
        )
        return result
