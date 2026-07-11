"""Unit tests for VoiceExtractRequest: transcript must have a length cap.

Security review finding: an unbounded transcript field let a client submit
arbitrarily large text into the (paid, per-request) LLM extraction pipeline.
"""

from __future__ import annotations

import pytest
from pydantic import ValidationError

from app.domains.finance.schemas import VoiceExtractRequest


def test_accepts_transcript_within_limit() -> None:
    req = VoiceExtractRequest(transcript="kopi 15rb")
    assert req.transcript == "kopi 15rb"


def test_rejects_transcript_over_max_length() -> None:
    with pytest.raises(ValidationError):
        VoiceExtractRequest(transcript="a" * 5001)
