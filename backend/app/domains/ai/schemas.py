"""Pydantic schemas for the AI domain endpoints."""

from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, Field

from app.domains.finance.models import TransactionStatus


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
    status: TransactionStatus


class ChatReply(BaseModel):
    reply: str
    session_id: uuid.UUID
    user_message_id: uuid.UUID
    assistant_message_id: uuid.UUID
    draft_transactions: list[DraftTransaction] = Field(default_factory=list)


class DailyInsight(BaseModel):
    insight: str
    generated_at: datetime
    is_cached: bool


class ChatMessageOut(BaseModel):
    id: uuid.UUID
    role: str
    content: str
    created_at: datetime


class SessionHistoryResponse(BaseModel):
    session_id: uuid.UUID
    messages: list[ChatMessageOut]
    draft_transactions: list[DraftTransaction] = Field(default_factory=list)
