"""Selects the STT provider named by the `STT_PROVIDER` setting."""

from __future__ import annotations

from app.ai.stt.base import STTProvider
from app.ai.stt.groq_whisper import GroqWhisperSTT
from app.core.config import Settings


def get_stt_provider(settings: Settings) -> STTProvider:
    """Return the configured speech-to-text provider.

    Raises `ValueError` for an unknown provider so misconfiguration fails fast
    at startup.
    """
    match settings.stt_provider:
        case "groq":
            return GroqWhisperSTT(settings)
        case other:
            raise ValueError(f"Unsupported STT provider: {other}")
