"""add budget_limit to categories

Revision ID: 0004_add_category_budget_limit
Revises: 0003_add_receipt_logs_transcribed_status
Create Date: 2026-06-06

"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "0004_add_category_budget_limit"
down_revision = "0003_add_receipt_logs_transcribed_status"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("categories", sa.Column("budget_limit", sa.BigInteger(), nullable=True))


def downgrade() -> None:
    op.drop_column("categories", "budget_limit")
