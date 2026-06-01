"""Build the app's speech-to-text provider."""

from __future__ import annotations

from app.ai.stt.base import STTProvider
from app.ai.stt.openrouter import OpenRouterSTT
from app.core.config import Settings


def get_stt_provider(settings: Settings) -> STTProvider:
    """Return the OpenRouter speech-to-text provider."""
    return OpenRouterSTT(settings)
