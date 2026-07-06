"""Pydantic schemas for the sync/import endpoint."""

from __future__ import annotations

import uuid
from datetime import date, datetime

from pydantic import BaseModel, Field

from app.domains.finance.models import AccountType, CategoryType, TransactionSource

MAX_IMPORT_ITEMS = 5000


class AccountImport(BaseModel):
    id: uuid.UUID
    name: str
    type: AccountType
    currency: str = "IDR"
    initial_balance: int = 0


class CategoryImport(BaseModel):
    id: uuid.UUID
    name: str
    type: CategoryType
    icon: str | None = None
    color: str | None = None


class TransactionImport(BaseModel):
    id: uuid.UUID
    account_id: uuid.UUID
    category_id: uuid.UUID | None = None
    amount: int
    currency: str = "IDR"
    merchant: str | None = None
    note: str | None = None
    occurred_at: datetime
    source: TransactionSource = TransactionSource.manual


class BudgetImport(BaseModel):
    id: uuid.UUID
    monthly_limit: int


class SavingsGoalImport(BaseModel):
    id: uuid.UUID
    name: str
    icon: str | None = None
    target_amount: int
    current_amount: int = 0
    target_date: date | None = None


class BulkImportPayload(BaseModel):
    accounts: list[AccountImport] = Field(default_factory=list, max_length=MAX_IMPORT_ITEMS)
    categories: list[CategoryImport] = Field(default_factory=list, max_length=MAX_IMPORT_ITEMS)
    transactions: list[TransactionImport] = Field(default_factory=list, max_length=MAX_IMPORT_ITEMS)
    budget: BudgetImport | None = None
    savings_goals: list[SavingsGoalImport] = Field(
        default_factory=list, max_length=MAX_IMPORT_ITEMS
    )


class ImportCounts(BaseModel):
    accounts: int = 0
    categories: int = 0
    transactions: int = 0
    budgets: int = 0
    savings_goals: int = 0


class BulkImportResult(BaseModel):
    imported: ImportCounts
