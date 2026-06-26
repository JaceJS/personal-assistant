"""Pydantic v2 request/response schemas for the finance domain."""

from __future__ import annotations

import uuid
from datetime import date, datetime

from pydantic import BaseModel, Field, field_validator

from app.domains.finance.models import (
    AccountType,
    CategoryType,
    TransactionSource,
    TransactionStatus,
    VoiceProcessingStatus,
)

# ── Savings Goals ─────────────────────────────────────────────────────────────

class SavingsGoalCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    icon: str | None = None
    target_amount: int
    target_date: str | None = None  # ISO date "YYYY-MM-DD"

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        return v.strip()


class SavingsGoalUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=100)
    icon: str | None = None
    target_amount: int | None = None
    target_date: str | None = None

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: str | None) -> str | None:
        return v.strip() if v is not None else None


class SavingsGoalContribute(BaseModel):
    amount: int

    @field_validator("amount")
    @classmethod
    def amount_not_zero(cls, v: int) -> int:
        if v == 0:
            raise ValueError("amount cannot be 0")
        return v


class SavingsGoalRead(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    user_id: uuid.UUID
    name: str
    icon: str | None
    target_amount: int
    current_amount: int
    target_date: date | None
    is_archived: bool
    is_completed: bool
    progress_pct: float
    created_at: datetime
    updated_at: datetime

    @classmethod
    def from_model(cls, goal: object) -> "SavingsGoalRead":
        from app.domains.finance.models import SavingsGoal as GoalModel
        g: GoalModel = goal  # type: ignore[assignment]
        pct = min(g.current_amount / g.target_amount * 100.0, 100.0) if g.target_amount > 0 else 0.0
        return cls(
            id=g.id,
            user_id=g.user_id,
            name=g.name,
            icon=g.icon,
            target_amount=g.target_amount,
            current_amount=g.current_amount,
            target_date=g.target_date,
            is_archived=g.is_archived,
            is_completed=g.current_amount >= g.target_amount,
            progress_pct=round(pct, 2),
            created_at=g.created_at,
            updated_at=g.updated_at,
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


class AnonymousVoiceResult(BaseModel):
    amount: int
    currency: str
    merchant: str | None
    category_name: str | None
    note: str | None
    confidence: float


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
