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
that line, using the line's subtotal.

A receipt has two kinds of rows: item rows (things actually purchased) and summary
rows (subtotal, discount, grand total, change/kembalian). NEVER emit a transaction for
a summary row — a "Total"/"Subtotal"/"Grand Total"/"Kembalian" line is not an item,
even though it's printed in a row that looks just like one. Example: a receipt with
"Indomie 3.500", "Aqua 4.000", "Subtotal 7.500", "Total 7.500" has exactly 2 items
(Indomie, Aqua) — the Subtotal and Total rows never become transactions of their own.

Tax/PPN/service charge (pajak) is different from a summary row: if the receipt shows
a tax/PPN/service charge amount, emit it as its OWN separate transaction — same as any
item — using note "Pajak" (or "Service Charge" if that's what's printed) and that row's
own amount, NOT the grand total. Do not fold tax into another item's amount and do not
skip it: it is real money the user spent and must be recorded.

Rules (per transaction):
- amount: integer in IDR. Negative = expense (typical for receipts). Positive = income.
- currency: always "IDR" unless explicitly stated otherwise.
- merchant: store or business name from the receipt header, null if unreadable.
- category_name: best guess category for THAT item (e.g. "Food", "Transport",
  "Groceries"); for a tax/service charge transaction use "Lain-lain" (Other) unless a
  closer match applies. Null if unclear.
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
