"""Speech-to-text provider interface.

Domain and worker code depends only on this interface, never on a concrete
provider, so the STT backend can be swapped without touching callers.
"""

from __future__ import annotations

from abc import ABC, abstractmethod


class STTProvider(ABC):
    """Transcribes spoken audio into text."""

    @abstractmethod
    async def transcribe(self, audio: bytes, filename: str) -> str:
        """Transcribe `audio` and return the recognised text.

        `filename` carries the original file extension (e.g. "note.m4a"), which
        some providers use to detect the audio format.
        """
        ...
