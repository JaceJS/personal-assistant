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
    created_at: datetime


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


class GuestAccountSnapshot(BaseModel):
    """A guest's locally-stored account, sent by the client on every request
    since the backend has no Postgres row for it to read."""

    id: uuid.UUID
    name: str
    balance: int
    currency: str = "IDR"


class GuestChatHistoryItem(BaseModel):
    role: str
    content: str


class GuestChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)
    accounts: list[GuestAccountSnapshot] = Field(default_factory=list, max_length=20)
    # Nothing is persisted server-side for guests, so the client resends the
    # short recent history each turn instead of the server replaying it from
    # chat_messages the way the authenticated /chat endpoint does.
    history: list[GuestChatHistoryItem] = Field(default_factory=list, max_length=20)


class GuestChatReply(BaseModel):
    reply: str
    draft_transactions: list[DraftTransaction] = Field(default_factory=list)
    remaining_quota: int
