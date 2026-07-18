"""add_receipt_log_id_to_transactions

Revision ID: 0014_add_receipt_log_id_to_transactions
Revises: 0013_enable_rls_new_tables
Create Date: 2026-07-18 10:43:50.059968

"""
from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = '0014_add_receipt_log_id_to_transactions'
down_revision: str | None = '0013_enable_rls_new_tables'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column('transactions', sa.Column('receipt_log_id', sa.UUID(), nullable=True))
    op.create_foreign_key(
        'transactions_receipt_log_id_fkey',
        'transactions',
        'receipt_logs',
        ['receipt_log_id'],
        ['id'],
        ondelete='SET NULL',
    )
    # Backfill from the old single-FK column (receipt_logs.transaction_id) so
    # existing receipts keep their transaction link under the new many-to-one
    # shape. receipt_logs.transaction_id itself is left in place, deprecated,
    # and dropped in a later migration once the new column is proven in prod.
    op.execute(
        """
        UPDATE transactions t
        SET receipt_log_id = rl.id
        FROM receipt_logs rl
        WHERE rl.transaction_id = t.id
        """
    )


def downgrade() -> None:
    op.drop_constraint('transactions_receipt_log_id_fkey', 'transactions', type_='foreignkey')
    op.drop_column('transactions', 'receipt_log_id')
