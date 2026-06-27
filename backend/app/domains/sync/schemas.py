"""Pydantic schemas for the sync/import endpoint."""

from __future__ import annotations

import uuid
from datetime import date, datetime

from pydantic import BaseModel

from app.domains.finance.models import AccountType, CategoryType, TransactionSource


class AccountImport(BaseModel):
    id: uuid.UUID
    name: str
    type: AccountType
    currency: str = "IDR"


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
    accounts: list[AccountImport] = []
    categories: list[CategoryImport] = []
    transactions: list[TransactionImport] = []
    budget: BudgetImport | None = None
    savings_goals: list[SavingsGoalImport] = []


class ImportCounts(BaseModel):
    accounts: int = 0
    categories: int = 0
    transactions: int = 0
    budgets: int = 0
    savings_goals: int = 0


class BulkImportResult(BaseModel):
    imported: ImportCounts
