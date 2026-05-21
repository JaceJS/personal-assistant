"""Voice-intent classification.

Routes a voice transcript to the domain that should handle it. Only the finance
domain exists today, so this is a stub that always returns "finance". It will
become a real classifier once journal/tasks/calendar domains are added.
"""

from __future__ import annotations

from typing import Literal

Intent = Literal["finance"]


def classify_intent(transcript: str) -> Intent:
    """Return the domain that should handle `transcript` (currently always finance)."""
    return "finance"
