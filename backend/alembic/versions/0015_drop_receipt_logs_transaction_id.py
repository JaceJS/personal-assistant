"""drop_receipt_logs_transaction_id

Revision ID: 0015_drop_receipt_logs_transaction_id
Revises: 0014_add_receipt_log_id_to_transactions
Create Date: 2026-07-18 11:25:27.527174

"""
from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = '0015_drop_receipt_logs_transaction_id'
down_revision: str | None = '0014_add_receipt_log_id_to_transactions'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.drop_constraint('receipt_logs_transaction_id_fkey', 'receipt_logs', type_='foreignkey')
    op.drop_column('receipt_logs', 'transaction_id')


def downgrade() -> None:
    op.add_column(
        'receipt_logs', sa.Column('transaction_id', sa.UUID(), autoincrement=False, nullable=True)
    )
    op.create_foreign_key(
        'receipt_logs_transaction_id_fkey',
        'receipt_logs',
        'transactions',
        ['transaction_id'],
        ['id'],
        ondelete='SET NULL',
    )
