"""Voice transcript → structured transaction extractor."""

from __future__ import annotations

from pydantic import BaseModel, Field

from app.ai.llm.base import LLMProvider
from app.core.exceptions import BadRequestError

_DEFAULT_CURRENCY = "IDR"
CONFIDENCE_THRESHOLD = 0.4

SLANG_MAP: dict[str, int] = {
    "gocap": 50_000,
    "ceban": 10_000,
    "goban": 20_000,
    "cepek": 100_000,
    "gopek": 500_000,
    "50rb": 50_000,
    "50k": 50_000,
    "100rb": 100_000,
    "100k": 100_000,
    "200rb": 200_000,
    "200k": 200_000,
}

_SLANG_EXAMPLES = "\n".join(f"  - {k} = {v:,}" for k, v in SLANG_MAP.items())

_SYSTEM_PROMPT = f"""You are a financial transaction extractor.

Language: Input is in Indonesian or English only. Handle both. Do not invent or guess
amounts (extract only what is explicitly stated in the transcript).

Extract a single transaction from the voice transcript.

Indonesian slang amounts (IDR):
{_SLANG_EXAMPLES}
  - lima puluh ribu = 50,000
  - seratus ribu = 100,000
  - dua ratus ribu = 200,000

Rules:
- amount: integer in IDR. Negative = expense, positive = income.
- currency: always "IDR" unless explicitly stated otherwise.
- merchant: business or person name, null if unknown.
- category_name: best guess category (e.g. "Food", "Transport", "Salary"), null if unclear.
- note: any extra detail from the transcript, null if none.
- confidence: 0.0-1.0 reflecting how certain you are.
"""


class ExtractedTransaction(BaseModel):
    amount: int = Field(..., description="Transaction amount; negative=expense, positive=income")
    currency: str = Field(default=_DEFAULT_CURRENCY)
    merchant: str | None = None
    category_name: str | None = None
    note: str | None = None
    confidence: float = Field(..., ge=0.0, le=1.0)


async def extract_transaction(transcript: str, llm: LLMProvider) -> ExtractedTransaction:
    """Extract a structured transaction from a voice transcript."""
    result = await llm.extract(
        system_prompt=_SYSTEM_PROMPT,
        user_content=transcript,
        response_model=ExtractedTransaction,
    )
    if result.confidence < CONFIDENCE_THRESHOLD:
        raise BadRequestError(
            f"Could not extract a transaction from the transcript "
            f"(confidence {result.confidence:.2f} < {CONFIDENCE_THRESHOLD}). "
            "Please try again with clearer audio or more detail."
        )
    return result
