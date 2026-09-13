"""add_ai_traces_table

Revision ID: 0018_add_ai_traces_table
Revises: 0017_add_transaction_status_cancelled
Create Date: 2026-09-12 00:00:00.000000

"""
from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0018_add_ai_traces_table"
down_revision: str | None = "0017_add_transaction_status_cancelled"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

# create_type=False keeps create_table from emitting its own CREATE TYPE;
# the types are created explicitly (and dropped) by this migration instead.
ai_feature = postgresql.ENUM(
    "voice_extraction", "receipt_extraction", "chat", name="ai_feature", create_type=False
)
ai_trace_status = postgresql.ENUM("success", "error", name="ai_trace_status", create_type=False)

_ENUMS = [ai_feature, ai_trace_status]


def upgrade() -> None:
    bind = op.get_bind()
    for enum in _ENUMS:
        enum.create(bind, checkfirst=True)

    op.create_table(
        "ai_traces",
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("feature", ai_feature, nullable=False),
        sa.Column("model", sa.Text(), nullable=False),
        sa.Column("status", ai_trace_status, nullable=False),
        sa.Column("latency_ms", sa.Integer(), nullable=False),
        sa.Column("prompt_tokens", sa.Integer(), nullable=True),
        sa.Column("completion_tokens", sa.Integer(), nullable=True),
        sa.Column("linked_entity_type", sa.Text(), nullable=True),
        sa.Column("linked_entity_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("response_excerpt", sa.Text(), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
    )
    op.create_index("ix_ai_traces_user_id", "ai_traces", ["user_id"])
    op.create_index("ix_ai_traces_created_at", "ai_traces", ["created_at"])
    op.execute("ALTER TABLE ai_traces ENABLE ROW LEVEL SECURITY")


def downgrade() -> None:
    op.drop_table("ai_traces")
    bind = op.get_bind()
    for enum in reversed(_ENUMS):
        enum.drop(bind, checkfirst=True)
