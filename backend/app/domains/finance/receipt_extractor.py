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

A receipt with a single line item (or one that's clearly a single service, like a
parking or toll ticket) returns one transaction using its total amount. A receipt
listing multiple distinct items (e.g. a supermarket or convenience-store haul) returns
ONE TRANSACTION PER ITEM, each using that item's own price — not the receipt's grand
total. Group identical repeated items (e.g. "2x Indomie") into a single transaction for
that line, using the line's subtotal. Ignore non-item lines (subtotal, tax, discount,
change) when deciding what to split.

Rules (per transaction):
- amount: integer in IDR. Negative = expense (typical for receipts). Positive = income.
- currency: always "IDR" unless explicitly stated otherwise.
- merchant: store or business name from the receipt header, null if unreadable.
- category_name: best guess category for THAT item (e.g. "Food", "Transport",
  "Groceries"), null if unclear.
- note: the item name/description backing that transaction, null if none.
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
