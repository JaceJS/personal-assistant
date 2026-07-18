"""Receipt image → structured transaction extractor."""

from __future__ import annotations

from app.ai.llm.base import LLMProvider
from app.domains.finance.extractor import (
    ExtractedTransaction,
    ExtractedTransactionList,
    select_confident_transactions,
)

MAX_TRANSACTIONS_PER_RECEIPT = 20

_SYSTEM_PROMPT = f"""You are a financial transaction extractor for Indonesian users.

Extract the transaction(s) from this receipt image.

Most receipts represent ONE purchase — return a single transaction using the TOTAL
amount shown at the bottom in that case. Do NOT split a normal receipt into one
transaction per line item. Only return more than one transaction if the receipt
clearly bundles genuinely separate categories of spending on one printout (e.g. a
supermarket receipt that also rings up pharmacy items) — one transaction per category,
each using the subtotal for that category, not each individual item.

Rules (per transaction):
- amount: integer in IDR. Negative = expense (typical for receipts). Positive = income.
- currency: always "IDR" unless explicitly stated otherwise.
- merchant: store or business name from the receipt header, null if unreadable.
- category_name: best guess category (e.g. "Food", "Transport", "Groceries"), null if unclear.
- note: list key items or a brief summary backing that transaction, null if none.
- confidence: 0.0-1.0 reflecting how certain you are about the extracted values.

Return at most {MAX_TRANSACTIONS_PER_RECEIPT} transactions.
"""


async def extract_transactions_from_receipt(
    image_bytes: bytes,
    media_type: str,
    llm: LLMProvider,
) -> list[ExtractedTransaction]:
    """Extract one or more structured transactions from a receipt image."""
    result = await llm.extract_from_image(
        system_prompt=_SYSTEM_PROMPT,
        image_bytes=image_bytes,
        image_media_type=media_type,
        response_model=ExtractedTransactionList,
    )
    return select_confident_transactions(
        result.transactions,
        max_items=MAX_TRANSACTIONS_PER_RECEIPT,
        source="receipt",
    )
