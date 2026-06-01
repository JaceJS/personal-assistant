"""OpenRouter speech-to-text provider."""

from __future__ import annotations

from openai import AsyncOpenAI

from app.ai.stt.base import STTProvider
from app.core.config import Settings

_OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"


class OpenRouterSTT(STTProvider):
    """Speech-to-text backed by OpenRouter's audio transcription endpoint."""

    def __init__(self, settings: Settings) -> None:
        self._client = AsyncOpenAI(
            api_key=settings.openrouter_api_key,
            base_url=_OPENROUTER_BASE_URL,
        )
        self._model = settings.stt_model

    async def transcribe(self, audio: bytes, filename: str) -> str:
        response = await self._client.audio.transcriptions.create(
            model=self._model,
            file=(filename, audio),
        )
        return response.text
