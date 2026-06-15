"""Pydantic schemas for the AI domain endpoints."""

from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)
    session_id: uuid.UUID | None = None


class DraftTransaction(BaseModel):
    transaction_id: uuid.UUID
    amount: int
    currency: str
    merchant: str | None
    category_name: str | None
    note: str | None
    account_id: uuid.UUID


class ChatReply(BaseModel):
    reply: str
    session_id: uuid.UUID
    draft_transaction: DraftTransaction | None = None


class DailyInsight(BaseModel):
    insight: str
    generated_at: datetime
    is_cached: bool
