"""initial finance schema

Creates the finance domain tables (accounts, categories, voice_logs,
transactions), their enums and indexes, and the Row-Level Security policies.

Revision ID: 0001_initial_finance
Revises:
Create Date: 2026-05-21

"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "0001_initial_finance"
down_revision = None
branch_labels = None
depends_on = None

# Enum types. `create_type=False` keeps create_table from emitting CREATE TYPE;
# the types are created explicitly (and dropped) by this migration instead.
account_type = postgresql.ENUM(
    "cash", "bank", "ewallet", "credit", name="account_type", create_type=False
)
category_type = postgresql.ENUM(
    "expense", "income", "transfer", name="category_type", create_type=False
)
transaction_source = postgresql.ENUM(
    "voice", "manual", "import", name="transaction_source", create_type=False
)
transaction_status = postgresql.ENUM(
    "draft", "confirmed", name="transaction_status", create_type=False
)
voice_processing_status = postgresql.ENUM(
    "pending", "transcribing", "extracting", "completed", "failed",
    name="voice_processing_status", create_type=False,
)

_ENUMS = [
    account_type,
    category_type,
    transaction_source,
    transaction_status,
    voice_processing_status,
]


def _uuid_pk() -> sa.Column:
    """A UUID primary-key column with a database-side default."""
    return sa.Column(
        "id",
        postgresql.UUID(as_uuid=True),
        primary_key=True,
        server_default=sa.text("gen_random_uuid()"),
    )


def _timestamps() -> list[sa.Column]:
    """The created_at / updated_at audit columns shared by every table."""
    return [
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.func.now()),
    ]


def upgrade() -> None:
    bind = op.get_bind()
    for enum in _ENUMS:
        enum.create(bind, checkfirst=True)

    op.create_table(
        "accounts",
        _uuid_pk(),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("type", account_type, nullable=False),
        sa.Column("currency", sa.Text(), nullable=False, server_default="IDR"),
        sa.Column("balance", sa.BigInteger(), nullable=False, server_default=sa.text("0")),
        sa.Column("is_archived", sa.Boolean(), nullable=False, server_default=sa.false()),
        *_timestamps(),
    )
    op.create_index("ix_accounts_user", "accounts", ["user_id"])

    op.create_table(
        "categories",
        _uuid_pk(),
        # NULL user_id marks a system-default category shared by all users.
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("icon", sa.Text(), nullable=True),
        sa.Column("color", sa.Text(), nullable=True),
        sa.Column("type", category_type, nullable=False),
        sa.Column("is_archived", sa.Boolean(), nullable=False, server_default=sa.false()),
        *_timestamps(),
    )

    op.create_table(
        "voice_logs",
        _uuid_pk(),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("audio_url", sa.Text(), nullable=False),
        sa.Column("transcript", sa.Text(), nullable=True),
        sa.Column("extracted_data", postgresql.JSONB(), nullable=True),
        sa.Column("confidence_score", sa.Float(), nullable=True),
        sa.Column("processing_status", voice_processing_status, nullable=False,
                  server_default="pending"),
        sa.Column("error_message", sa.Text(), nullable=True),
        *_timestamps(),
    )
    op.create_index(
        "ix_voice_logs_user_created",
        "voice_logs",
        ["user_id", sa.text("created_at DESC")],
    )

    op.create_table(
        "transactions",
        _uuid_pk(),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("account_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("accounts.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("category_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("categories.id", ondelete="SET NULL"), nullable=True),
        # amount is negative for an expense, positive for income.
        sa.Column("amount", sa.BigInteger(), nullable=False),
        sa.Column("currency", sa.Text(), nullable=False, server_default="IDR"),
        sa.Column("merchant", sa.Text(), nullable=True),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("occurred_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("source", transaction_source, nullable=False, server_default="manual"),
        sa.Column("status", transaction_status, nullable=False, server_default="confirmed"),
        sa.Column("voice_log_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("voice_logs.id", ondelete="SET NULL"), nullable=True),
        *_timestamps(),
    )
    op.create_index(
        "ix_transactions_user_occurred",
        "transactions",
        ["user_id", sa.text("occurred_at DESC")],
    )
    op.create_index(
        "ix_transactions_user_category_occurred",
        "transactions",
        ["user_id", "category_id", sa.text("occurred_at DESC")],
    )

    _apply_row_level_security()


def _apply_row_level_security() -> None:
    """Enable RLS on every table and, on Supabase, add the owner policies.

    The policies reference `auth.uid()`, which only exists on Supabase. The
    guarded DO block makes this migration a clean no-op on a plain local
    Postgres while still applying real security on Supabase.
    """
    for table in ("accounts", "categories", "voice_logs", "transactions"):
        op.execute(f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY")

    op.execute(
        """
        DO $$
        BEGIN
          IF EXISTS (
            SELECT 1 FROM information_schema.schemata WHERE schema_name = 'auth'
          ) THEN
            CREATE POLICY accounts_owner ON accounts FOR ALL
              USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

            CREATE POLICY transactions_owner ON transactions FOR ALL
              USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

            CREATE POLICY voice_logs_owner ON voice_logs FOR ALL
              USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

            -- Categories: system defaults (user_id IS NULL) are readable by
            -- everyone, but only the owner may modify their own categories.
            CREATE POLICY categories_select ON categories FOR SELECT
              USING (user_id = auth.uid() OR user_id IS NULL);
            CREATE POLICY categories_insert ON categories FOR INSERT
              WITH CHECK (user_id = auth.uid());
            CREATE POLICY categories_update ON categories FOR UPDATE
              USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
            CREATE POLICY categories_delete ON categories FOR DELETE
              USING (user_id = auth.uid());
          END IF;
        END
        $$;
        """
    )


def downgrade() -> None:
    # Dropping the tables also drops their indexes and RLS policies.
    op.drop_table("transactions")
    op.drop_table("voice_logs")
    op.drop_table("categories")
    op.drop_table("accounts")

    bind = op.get_bind()
    for enum in reversed(_ENUMS):
        enum.drop(bind, checkfirst=True)
