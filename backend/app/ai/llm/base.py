"""Large language model provider interface.

The only LLM capability the app needs is structured extraction: turn free text
into a validated Pydantic model. Callers depend on this interface, not on a
concrete provider.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import TypeVar

from pydantic import BaseModel

# The Pydantic model an extraction call should return.
T = TypeVar("T", bound=BaseModel)


class LLMProvider(ABC):
    """Extracts structured data from text or images using an LLM."""

    @abstractmethod
    async def extract(
        self, system_prompt: str, user_content: str, response_model: type[T]
    ) -> T:
        """Call the LLM and return its answer parsed into `response_model`."""
        ...

    @abstractmethod
    async def extract_from_image(
        self,
        system_prompt: str,
        image_bytes: bytes,
        image_media_type: str,
        response_model: type[T],
    ) -> T:
        """Call a vision-capable LLM with an image and return structured output."""
        ...

    @abstractmethod
    async def chat(self, system_prompt: str, user_message: str) -> str:
        """Call the LLM for free-form conversation and return the reply text."""
        ...
