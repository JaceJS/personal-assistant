"""SQLAlchemy models for cross-cutting infra, not owned by any single domain."""

from __future__ import annotations

from datetime import datetime

import sqlalchemy as sa
from sqlalchemy.orm import Mapped, mapped_column

from app.shared.models import TimestampedBase


class RateLimitCounter(TimestampedBase):
    __tablename__ = "rate_limit_counters"

    key: Mapped[str] = mapped_column(sa.Text(), nullable=False, unique=True)
    count: Mapped[int] = mapped_column(sa.Integer(), nullable=False, server_default="1")
    expires_at: Mapped[datetime] = mapped_column(sa.DateTime(timezone=True), nullable=False)
