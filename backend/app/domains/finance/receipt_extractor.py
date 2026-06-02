"""Receipt image → structured transaction extractor."""

from __future__ import annotations

from app.ai.llm.base import LLMProvider
from app.domains.finance.extractor import ExtractedTransaction

_SYSTEM_PROMPT = """You are a financial transaction extractor for Indonesian users.

Extract the total transaction from this receipt image.

Rules:
- amount: integer in IDR. Negative = expense (typical for receipts). Positive = income.
- currency: always "IDR" unless explicitly stated otherwise.
- merchant: store or business name from the receipt header, null if unreadable.
- category_name: best guess category (e.g. "Food", "Transport", "Groceries"), null if unclear.
- note: list key items or a brief summary from the receipt, null if none.
- confidence: 0.0-1.0 reflecting how certain you are about the extracted values.

Focus on the TOTAL amount shown at the bottom of the receipt.
"""


async def extract_from_receipt(
    image_bytes: bytes,
    media_type: str,
    llm: LLMProvider,
) -> ExtractedTransaction:
    """Extract a structured transaction from a receipt image."""
    return await llm.extract_from_image(
        system_prompt=_SYSTEM_PROMPT,
        image_bytes=image_bytes,
        image_media_type=media_type,
        response_model=ExtractedTransaction,
    )
