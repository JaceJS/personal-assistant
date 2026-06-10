"""add budget_limit to categories

Revision ID: 0003_add_category_budget_limit
Revises: 1c2ba35e305a
Create Date: 2026-06-06

"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "0003_add_category_budget_limit"
down_revision = "1c2ba35e305a"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("categories", sa.Column("budget_limit", sa.BigInteger(), nullable=True))


def downgrade() -> None:
    op.drop_column("categories", "budget_limit")
