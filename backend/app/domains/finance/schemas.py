"""Pydantic v2 request/response schemas for the finance domain."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Generic, TypeVar

from pydantic import BaseModel

from app.domains.finance.models import (
    AccountType,
    CategoryType,
    TransactionSource,
    TransactionStatus,
)

T = TypeVar("T")


class PaginatedList(BaseModel, Generic[T]):  # noqa: UP046
    items: list[T]
    total: int


# ── Account ───────────────────────────────────────────────────────────────────

class AccountCreate(BaseModel):
    name: str
    type: AccountType
    currency: str = "IDR"


class AccountUpdate(BaseModel):
    name: str | None = None
    is_archived: bool | None = None


class AccountRead(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    user_id: uuid.UUID
    name: str
    type: AccountType
    currency: str
    balance: int
    is_archived: bool
    created_at: datetime
    updated_at: datetime


# ── Category ──────────────────────────────────────────────────────────────────

class CategoryCreate(BaseModel):
    name: str
    type: CategoryType
    icon: str | None = None
    color: str | None = None


class CategoryRead(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    user_id: uuid.UUID | None
    name: str
    type: CategoryType
    icon: str | None
    color: str | None
    is_archived: bool
    created_at: datetime
    updated_at: datetime


# ── Transaction ───────────────────────────────────────────────────────────────

class TransactionCreate(BaseModel):
    account_id: uuid.UUID
    category_id: uuid.UUID | None = None
    amount: int  # negative = expense, positive = income
    currency: str = "IDR"
    merchant: str | None = None
    note: str | None = None
    occurred_at: datetime
    source: TransactionSource = TransactionSource.manual
    status: TransactionStatus = TransactionStatus.confirmed
    voice_log_id: uuid.UUID | None = None


class TransactionUpdate(BaseModel):
    category_id: uuid.UUID | None = None
    amount: int | None = None
    merchant: str | None = None
    note: str | None = None
    occurred_at: datetime | None = None
    status: TransactionStatus | None = None


class TransactionRead(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    user_id: uuid.UUID
    account_id: uuid.UUID
    category_id: uuid.UUID | None
    amount: int
    currency: str
    merchant: str | None
    note: str | None
    occurred_at: datetime
    source: TransactionSource
    status: TransactionStatus
    voice_log_id: uuid.UUID | None
    created_at: datetime
    updated_at: datetime
