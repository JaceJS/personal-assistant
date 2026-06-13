"""Pydantic v2 request/response schemas for the finance domain."""

from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, field_validator

from app.domains.finance.models import (
    AccountType,
    CategoryType,
    TransactionSource,
    TransactionStatus,
    VoiceProcessingStatus,
)

# ── Budget ────────────────────────────────────────────────────────────────────

class BudgetUpsert(BaseModel):
    monthly_limit: int


class BudgetRead(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    user_id: uuid.UUID
    monthly_limit: int
    updated_at: datetime


# ── Account ───────────────────────────────────────────────────────────────────

class AccountCreate(BaseModel):
    name: str
    type: AccountType
    currency: str = "IDR"

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Account name cannot be empty")
        return v


class AccountUpdate(BaseModel):
    name: str | None = None
    is_archived: bool | None = None

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: str | None) -> str | None:
        if v is None:
            return v
        v = v.strip()
        if not v:
            raise ValueError("Account name cannot be empty")
        return v


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

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Category name cannot be empty")
        return v


class CategoryUpdate(BaseModel):
    name: str | None = None
    icon: str | None = None
    color: str | None = None
    budget_limit: int | None = None
    is_fixed: bool | None = None
    is_archived: bool | None = None

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: str | None) -> str | None:
        if v is None:
            return v
        v = v.strip()
        if not v:
            raise ValueError("Category name cannot be empty")
        return v


class CategoryRead(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    user_id: uuid.UUID | None
    name: str
    type: CategoryType
    icon: str | None
    color: str | None
    budget_limit: int | None = None
    is_fixed: bool = False
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
    account_id: uuid.UUID | None = None
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


# Voice


class VoiceUploadResponse(BaseModel):
    voice_log_id: uuid.UUID
    status: VoiceProcessingStatus


class VoiceExtractedData(BaseModel):
    amount: int
    currency: str = "IDR"
    merchant: str | None = None
    category_name: str | None = None
    note: str | None = None
    confidence: float


class VoiceStatusRead(BaseModel):
    id: uuid.UUID
    status: VoiceProcessingStatus
    transcript: str | None
    extracted_data: VoiceExtractedData | None
    transaction_id: uuid.UUID | None
    error_message: str | None


class VoiceExtractRequest(BaseModel):
    transcript: str

    @field_validator("transcript")
    @classmethod
    def transcript_not_empty(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Transcript cannot be empty")
        return v


class VoiceExtractResponse(BaseModel):
    voice_log_id: uuid.UUID
    status: VoiceProcessingStatus


# Receipt


class ReceiptUploadResponse(BaseModel):
    receipt_log_id: uuid.UUID
    status: VoiceProcessingStatus


class ReceiptStatusRead(BaseModel):
    id: uuid.UUID
    status: VoiceProcessingStatus
    extracted_data: VoiceExtractedData | None
    transaction_id: uuid.UUID | None
    error_message: str | None
