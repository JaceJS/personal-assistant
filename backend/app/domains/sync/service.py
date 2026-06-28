"""Sync domain service, orchestrating bulk import in dependency order."""

from __future__ import annotations

import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.sync import repository as repo
from app.domains.sync.schemas import BulkImportPayload, BulkImportResult, ImportCounts


async def bulk_import(
    session: AsyncSession, user_id: uuid.UUID, payload: BulkImportPayload
) -> BulkImportResult:
    accounts_count = await repo.import_accounts(session, user_id, payload.accounts)
    categories_count = await repo.import_categories(session, user_id, payload.categories)
    transactions_count = await repo.import_transactions(session, user_id, payload.transactions)
    budgets_count = await repo.import_budget(session, user_id, payload.budget)
    savings_goals_count = await repo.import_savings_goals(session, user_id, payload.savings_goals)

    return BulkImportResult(
        imported=ImportCounts(
            accounts=accounts_count,
            categories=categories_count,
            transactions=transactions_count,
            budgets=budgets_count,
            savings_goals=savings_goals_count,
        )
    )
