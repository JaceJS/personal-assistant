"""Voice transcript → structured transaction extractor."""

from __future__ import annotations

from pydantic import BaseModel, Field

from app.ai.llm.base import LLMProvider
from app.core.exceptions import BadRequestError

_DEFAULT_CURRENCY = "IDR"
CONFIDENCE_THRESHOLD = 0.4
MAX_TRANSACTIONS_PER_VOICE_NOTE = 10

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

Extract EVERY distinct transaction mentioned in the voice transcript. Most transcripts
describe a single purchase — return one transaction in that case. If the user lists
multiple separate items or amounts (e.g. "beli kopi 15rb sama parkir 5rb"), return one
transaction per item. Never merge distinct amounts into one transaction, and never split
a single amount into several.

Indonesian slang amounts (IDR):
{_SLANG_EXAMPLES}
  - lima puluh ribu = 50,000
  - seratus ribu = 100,000
  - dua ratus ribu = 200,000

Rules (per transaction):
- amount: integer in IDR. Negative = expense, positive = income.
- currency: always "IDR" unless explicitly stated otherwise.
- merchant: business or person name, null if unknown.
- category_name: best guess category (e.g. "Food", "Transport", "Salary"), null if unclear.
- note: any extra detail for that specific item, null if none.
- confidence: 0.0-1.0 reflecting how certain you are about that transaction.

Return at most {MAX_TRANSACTIONS_PER_VOICE_NOTE} transactions. If the transcript names
more distinct items than that, keep only the ones you are most confident about.
"""


class ExtractedTransaction(BaseModel):
    amount: int = Field(..., description="Transaction amount; negative=expense, positive=income")
    currency: str = Field(default=_DEFAULT_CURRENCY)
    merchant: str | None = None
    category_name: str | None = None
    note: str | None = None
    confidence: float = Field(..., ge=0.0, le=1.0)


class ExtractedTransactionList(BaseModel):
    transactions: list[ExtractedTransaction] = Field(default_factory=list)


def select_confident_transactions(
    transactions: list[ExtractedTransaction],
    *,
    max_items: int,
    source: str,
) -> list[ExtractedTransaction]:
    """Cap to `max_items` and drop any transaction below the confidence bar.

    Filtering per-item (rather than gating on one overall confidence score)
    means one unclear item doesn't discard the rest of a transcript/receipt
    that was read correctly. Raises only when nothing confident survives.
    """
    kept = [t for t in transactions[:max_items] if t.confidence >= CONFIDENCE_THRESHOLD]
    if not kept:
        raise BadRequestError(
            f"Could not extract a transaction from the {source} "
            f"(no candidate reached confidence {CONFIDENCE_THRESHOLD}). "
            "Please try again with clearer audio or more detail."
        )
    return kept


async def extract_transactions(transcript: str, llm: LLMProvider) -> list[ExtractedTransaction]:
    """Extract one or more structured transactions from a voice transcript."""
    result = await llm.extract(
        system_prompt=_SYSTEM_PROMPT,
        user_content=transcript,
        response_model=ExtractedTransactionList,
    )
    return select_confident_transactions(
        result.transactions,
        max_items=MAX_TRANSACTIONS_PER_VOICE_NOTE,
        source="transcript",
    )
