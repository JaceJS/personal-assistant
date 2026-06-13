"""add_receipt_logs_transcribed_status

Revision ID: 0003_add_receipt_logs_transcribed_status
Revises: 0002_add_budgets_table
Create Date: 2026-06-02 21:23:08.221728

"""
from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = '0003_add_receipt_logs_transcribed_status'
down_revision: str | None = '0002_add_budgets_table'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

# Use postgresql.ENUM with create_type=False so Alembic never emits CREATE TYPE.
# The ADD VALUE statements below extend the existing DB enum types.
voice_processing_status = postgresql.ENUM(
    'pending', 'transcribing', 'transcribed', 'extracting', 'completed', 'failed',
    name='voice_processing_status',
    create_type=False,
)


def upgrade() -> None:
    # Extend existing enums with new values.
    op.execute("ALTER TYPE voice_processing_status ADD VALUE IF NOT EXISTS 'transcribed' AFTER 'transcribing'")
    op.execute("ALTER TYPE transaction_source ADD VALUE IF NOT EXISTS 'receipt'")

    op.create_table(
        'receipt_logs',
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('account_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('image_url', sa.Text(), nullable=False),
        sa.Column('ocr_text', sa.Text(), nullable=True),
        sa.Column('extracted_data', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('processing_status', voice_processing_status, server_default='pending', nullable=False),
        sa.Column('transaction_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['account_id'], ['accounts.id'], ondelete='RESTRICT'),
        sa.ForeignKeyConstraint(['transaction_id'], ['transactions.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.drop_index(op.f('ix_accounts_user'), table_name='accounts')
    op.drop_index(op.f('ix_budgets_user'), table_name='budgets')
    op.drop_index(op.f('ix_transactions_user_category_occurred'), table_name='transactions')
    op.drop_index(op.f('ix_transactions_user_occurred'), table_name='transactions')
    op.add_column('voice_logs', sa.Column('account_id', postgresql.UUID(as_uuid=True), nullable=True))
    op.drop_index(op.f('ix_voice_logs_user_created'), table_name='voice_logs')
    op.create_foreign_key(None, 'voice_logs', 'accounts', ['account_id'], ['id'], ondelete='SET NULL')


def downgrade() -> None:
    op.drop_constraint(None, 'voice_logs', type_='foreignkey')
    op.create_index(op.f('ix_voice_logs_user_created'), 'voice_logs', ['user_id', sa.literal_column('created_at DESC')], unique=False)
    op.drop_column('voice_logs', 'account_id')
    op.create_index(op.f('ix_transactions_user_occurred'), 'transactions', ['user_id', sa.literal_column('occurred_at DESC')], unique=False)
    op.create_index(op.f('ix_transactions_user_category_occurred'), 'transactions', ['user_id', 'category_id', sa.literal_column('occurred_at DESC')], unique=False)
    op.create_index(op.f('ix_budgets_user'), 'budgets', ['user_id'], unique=False)
    op.create_index(op.f('ix_accounts_user'), 'accounts', ['user_id'], unique=False)
    op.drop_table('receipt_logs')
