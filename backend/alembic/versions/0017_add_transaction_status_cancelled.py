"""add_transaction_status_cancelled

Revision ID: 0017_add_transaction_status_cancelled
Revises: 0016_add_rate_limit_and_insight_cache_tables
Create Date: 2026-08-03 21:30:00.000000

"""

from __future__ import annotations

from collections.abc import Sequence

from alembic import op

revision: str = "0017_add_transaction_status_cancelled"
down_revision: str | None = "0016_add_rate_limit_and_insight_cache_tables"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute("ALTER TYPE transaction_status ADD VALUE IF NOT EXISTS 'cancelled'")


def downgrade() -> None:
    pass
