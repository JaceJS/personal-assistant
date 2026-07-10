"""widen alembic_version.version_num column

Revision IDs like "0003_add_receipt_logs_transcribed_status" (40 chars) and
"0005_remove_transfer_category_type" (34 chars) exceed Alembic's default
VARCHAR(32) for alembic_version.version_num, breaking `alembic upgrade head`
partway through. Widen it once here so every later revision fits.

Revision ID: 0003_widen_alembic_version_column
Revises: 0002_add_budgets_table
Create Date: 2026-07-10

"""

from __future__ import annotations

from collections.abc import Sequence

from alembic import op

revision: str = "0003_widen_alembic_version_column"
down_revision: str | None = "0002_add_budgets_table"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute("ALTER TABLE alembic_version ALTER COLUMN version_num TYPE VARCHAR(255)")


def downgrade() -> None:
    # Not reversible in general (later revision ids may exceed VARCHAR(32)
    # again), so this is intentionally a no-op.
    pass
