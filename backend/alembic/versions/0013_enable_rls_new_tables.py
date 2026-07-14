"""enable_rls_new_tables

Codify RLS for every table created after 0002 (plus `budgets`, whose ENABLE
was hidden inside the Supabase-only guard in 0002). Without RLS these tables
are readable/writable through Supabase PostgREST with the anon key that ships
in the mobile app. Prod already has RLS enabled on them (done manually via
dashboard); this migration makes fresh environments (staging, local) match.

RLS enabled with no policies = deny-all for anon/authenticated, which is
correct: the app never uses PostgREST, all data access goes through FastAPI
(which connects as the table owner and bypasses RLS).

Every future migration that creates a table MUST enable RLS on it —
tests/integration/test_rls_migrations.py enforces this.

Revision ID: 0013_enable_rls_new_tables
Revises: 0012_add_chat_session_id_to_transactions
Create Date: 2026-07-14

"""
from __future__ import annotations

from collections.abc import Sequence

from alembic import op

revision: str = '0013_enable_rls_new_tables'
down_revision: str | None = '0012_add_chat_session_id_to_transactions'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

TABLES = (
    "budgets",
    "receipt_logs",
    "user_category_budgets",
    "chat_sessions",
    "chat_messages",
    "savings_goals",
)


def upgrade() -> None:
    for table in TABLES:
        op.execute(f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY")


def downgrade() -> None:
    for table in TABLES:
        op.execute(f"ALTER TABLE {table} DISABLE ROW LEVEL SECURITY")
