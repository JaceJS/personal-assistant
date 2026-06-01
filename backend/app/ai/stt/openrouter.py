"""OpenRouter speech-to-text provider."""

from __future__ import annotations

import base64
from pathlib import Path

import httpx

from app.ai.stt.base import STTProvider
from app.core.config import Settings

_OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"
_APP_TITLE = "voice-finance-backend"


class OpenRouterSTT(STTProvider):
    """Speech-to-text backed by OpenRouter's audio transcription endpoint."""

    def __init__(self, settings: Settings) -> None:
        self._api_key = settings.openrouter_api_key
        self._model = settings.stt_model

    async def transcribe(self, audio: bytes, filename: str) -> str:
        audio_format = Path(filename).suffix.removeprefix(".").lower() or "webm"
        payload = {
            "input_audio": {
                "data": base64.b64encode(audio).decode("ascii"),
                "format": audio_format,
            },
            "model": self._model,
        }

        async with httpx.AsyncClient(base_url=_OPENROUTER_BASE_URL, timeout=60.0) as client:
            response = await client.post(
                "/audio/transcriptions",
                headers={
                    "Authorization": f"Bearer {self._api_key}",
                    "Content-Type": "application/json",
                    "X-Title": _APP_TITLE,
                },
                json=payload,
            )
            response.raise_for_status()
            data = response.json()

        text = data.get("text")
        if not isinstance(text, str):
            raise ValueError("OpenRouter transcription response did not include text")
        return text
