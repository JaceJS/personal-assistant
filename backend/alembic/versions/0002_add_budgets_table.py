"""add budgets table

Revision ID: 0002_add_budgets_table
Revises: 0001_initial_finance
Create Date: 2026-05-28

"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "0002_add_budgets_table"
down_revision = "0001_initial_finance"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "budgets",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("monthly_limit", sa.BigInteger(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", name="uq_budgets_user_id"),
    )
    op.create_index("ix_budgets_user", "budgets", ["user_id"])

    # RLS uses auth.uid() which only exists in Supabase, skipped on plain PostgreSQL
    op.execute(
        """
        DO $$
        BEGIN
          IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'auth') THEN
            ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
            CREATE POLICY budgets_user_isolation ON budgets
              USING (user_id = (auth.uid())::uuid)
              WITH CHECK (user_id = (auth.uid())::uuid);
          END IF;
        END
        $$;
        """
    )


def downgrade() -> None:
    op.execute("DROP POLICY IF EXISTS budgets_user_isolation ON budgets")
    op.drop_index("ix_budgets_user", table_name="budgets")
    op.drop_table("budgets")
