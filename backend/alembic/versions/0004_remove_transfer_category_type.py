"""remove transfer from category_type enum

Revision ID: 0004_remove_transfer_category_type
Revises: 0003_add_category_budget_limit
Create Date: 2026-06-13
"""

from alembic import op

revision = "0004_remove_transfer_type"
down_revision = "0003_add_category_budget_limit"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Drop system transfer categories first (seed data rows)
    op.execute("DELETE FROM categories WHERE user_id IS NULL AND type = 'transfer'")
    # Reclassify any user-created transfer categories to expense
    op.execute("UPDATE categories SET type = 'expense' WHERE type = 'transfer'")
    # Recreate enum without 'transfer' (PostgreSQL can't DROP enum values directly)
    op.execute("ALTER TYPE category_type RENAME TO category_type_old")
    op.execute("CREATE TYPE category_type AS ENUM ('expense', 'income')")
    op.execute(
        "ALTER TABLE categories ALTER COLUMN type TYPE category_type "
        "USING type::text::category_type"
    )
    op.execute("DROP TYPE category_type_old")


def downgrade() -> None:
    op.execute("ALTER TYPE category_type RENAME TO category_type_old")
    op.execute("CREATE TYPE category_type AS ENUM ('expense', 'income', 'transfer')")
    op.execute(
        "ALTER TABLE categories ALTER COLUMN type TYPE category_type "
        "USING type::text::category_type"
    )
    op.execute("DROP TYPE category_type_old")
