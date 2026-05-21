"""Groq Whisper speech-to-text provider.

Groq exposes an OpenAI-compatible audio transcription endpoint, so the standard
OpenAI async client is used with Groq's base URL.
"""

from __future__ import annotations

from openai import AsyncOpenAI

from app.ai.stt.base import STTProvider
from app.core.config import Settings

_GROQ_BASE_URL = "https://api.groq.com/openai/v1"
_WHISPER_MODEL = "whisper-large-v3"


class GroqWhisperSTT(STTProvider):
    """Speech-to-text backed by Groq's hosted Whisper model."""

    def __init__(self, settings: Settings) -> None:
        self._client = AsyncOpenAI(api_key=settings.groq_api_key, base_url=_GROQ_BASE_URL)

    async def transcribe(self, audio: bytes, filename: str) -> str:
        response = await self._client.audio.transcriptions.create(
            model=_WHISPER_MODEL,
            file=(filename, audio),
        )
        return response.text
