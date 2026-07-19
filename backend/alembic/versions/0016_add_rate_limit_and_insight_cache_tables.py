"""add_rate_limit_and_insight_cache_tables

Revision ID: 0016_add_rate_limit_and_insight_cache_tables
Revises: 0015_drop_receipt_logs_transaction_id
Create Date: 2026-07-19 16:32:48.592866

"""
from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = '0016_add_rate_limit_and_insight_cache_tables'
down_revision: str | None = '0015_drop_receipt_logs_transaction_id'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        'daily_insight_cache',
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('insight', sa.Text(), nullable=False),
        sa.Column('generated_date', sa.Date(), nullable=False),
        sa.Column('id', sa.UUID(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column(
            'created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'),
            nullable=False,
        ),
        sa.Column(
            'updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id'),
    )
    op.create_table(
        'rate_limit_counters',
        sa.Column('key', sa.Text(), nullable=False),
        sa.Column('count', sa.Integer(), server_default='1', nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('id', sa.UUID(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column(
            'created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'),
            nullable=False,
        ),
        sa.Column(
            'updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('key'),
    )
    op.execute("ALTER TABLE daily_insight_cache ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE rate_limit_counters ENABLE ROW LEVEL SECURITY")


def downgrade() -> None:
    op.drop_table('rate_limit_counters')
    op.drop_table('daily_insight_cache')
