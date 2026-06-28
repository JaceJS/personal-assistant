"""add_is_fixed_to_categories

Revision ID: 0006_add_is_fixed_to_categories
Revises: 0005_remove_transfer_category_type
Create Date: 2026-06-13 21:18:06.729058

"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0006_add_is_fixed_to_categories"
down_revision: str | None = "0005_remove_transfer_category_type"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "categories",
        sa.Column("is_fixed", sa.Boolean(), server_default=sa.text("false"), nullable=False),
    )


def downgrade() -> None:
    op.drop_column("categories", "is_fixed")
