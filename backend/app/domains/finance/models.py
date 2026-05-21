"""SQLAlchemy 2.0 models for the finance domain."""

from __future__ import annotations

import enum
import uuid
from datetime import datetime
from typing import Any

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.shared.models import TimestampedBase


class AccountType(enum.StrEnum):
    cash = "cash"
    bank = "bank"
    ewallet = "ewallet"
    credit = "credit"


class CategoryType(enum.StrEnum):
    expense = "expense"
    income = "income"
    transfer = "transfer"


class TransactionSource(enum.StrEnum):
    voice = "voice"
    manual = "manual"
    import_ = "import"


class TransactionStatus(enum.StrEnum):
    draft = "draft"
    confirmed = "confirmed"


class VoiceProcessingStatus(enum.StrEnum):
    pending = "pending"
    transcribing = "transcribing"
    extracting = "extracting"
    completed = "completed"
    failed = "failed"


def _pg_enum(enum_cls: type, name: str) -> sa.Enum:
    """Return a PostgreSQL enum column type that reuses an existing DB type."""
    return sa.Enum(enum_cls, name=name, create_type=False)


class Account(TimestampedBase):
    __tablename__ = "accounts"

    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    name: Mapped[str] = mapped_column(sa.Text(), nullable=False)
    type: Mapped[AccountType] = mapped_column(
        _pg_enum(AccountType, "account_type"), nullable=False
    )
    currency: Mapped[str] = mapped_column(sa.Text(), nullable=False, server_default="IDR")
    balance: Mapped[int] = mapped_column(
        sa.BigInteger(), nullable=False, server_default=sa.text("0")
    )
    is_archived: Mapped[bool] = mapped_column(
        sa.Boolean(), nullable=False, server_default=sa.false()
    )


class Category(TimestampedBase):
    __tablename__ = "categories"

    user_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    name: Mapped[str] = mapped_column(sa.Text(), nullable=False)
    icon: Mapped[str | None] = mapped_column(sa.Text(), nullable=True)
    color: Mapped[str | None] = mapped_column(sa.Text(), nullable=True)
    type: Mapped[CategoryType] = mapped_column(
        _pg_enum(CategoryType, "category_type"), nullable=False
    )
    is_archived: Mapped[bool] = mapped_column(
        sa.Boolean(), nullable=False, server_default=sa.false()
    )


class VoiceLog(TimestampedBase):
    __tablename__ = "voice_logs"

    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    audio_url: Mapped[str] = mapped_column(sa.Text(), nullable=False)
    transcript: Mapped[str | None] = mapped_column(sa.Text(), nullable=True)
    extracted_data: Mapped[dict[str, Any] | None] = mapped_column(JSONB(), nullable=True)
    confidence_score: Mapped[float | None] = mapped_column(sa.Float(), nullable=True)
    processing_status: Mapped[VoiceProcessingStatus] = mapped_column(
        _pg_enum(VoiceProcessingStatus, "voice_processing_status"),
        nullable=False,
        server_default="pending",
    )
    error_message: Mapped[str | None] = mapped_column(sa.Text(), nullable=True)


class Transaction(TimestampedBase):
    __tablename__ = "transactions"

    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    account_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        sa.ForeignKey("accounts.id", ondelete="RESTRICT"),
        nullable=False,
    )
    category_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        sa.ForeignKey("categories.id", ondelete="SET NULL"),
        nullable=True,
    )
    amount: Mapped[int] = mapped_column(sa.BigInteger(), nullable=False)
    currency: Mapped[str] = mapped_column(sa.Text(), nullable=False, server_default="IDR")
    merchant: Mapped[str | None] = mapped_column(sa.Text(), nullable=True)
    note: Mapped[str | None] = mapped_column(sa.Text(), nullable=True)
    occurred_at: Mapped[datetime] = mapped_column(sa.DateTime(timezone=True), nullable=False)
    source: Mapped[TransactionSource] = mapped_column(
        _pg_enum(TransactionSource, "transaction_source"),
        nullable=False,
        server_default="manual",
    )
    status: Mapped[TransactionStatus] = mapped_column(
        _pg_enum(TransactionStatus, "transaction_status"),
        nullable=False,
        server_default="confirmed",
    )
    voice_log_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        sa.ForeignKey("voice_logs.id", ondelete="SET NULL"),
        nullable=True,
    )
