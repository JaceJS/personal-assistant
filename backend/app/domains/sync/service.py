"""Sync domain service, orchestrating bulk import in dependency order."""

from __future__ import annotations

import uuid
from collections import defaultdict

import structlog
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.finance import repository as finance_repo
from app.domains.finance import service as finance_service
from app.domains.sync import repository as repo
from app.domains.sync.schemas import (
    BulkImportPayload,
    BulkImportResult,
    ImportCounts,
    TransactionImport,
)

_logger = structlog.get_logger(__name__)


async def _apply_balance_deltas(
    session: AsyncSession, user_id: uuid.UUID, inserted: list[tuple[uuid.UUID, int]]
) -> None:
    deltas: dict[uuid.UUID, int] = defaultdict(int)
    for account_id, amount in inserted:
        deltas[account_id] += amount
    for account_id, delta in deltas.items():
        account = await finance_repo.get_account_for_update(session, account_id)
        # Payloads may reference accounts the user does not own; never move
        # another user's balance.
        if account is None or account.user_id != user_id:
            continue
        await finance_repo.update_account(session, account, balance=account.balance + delta)


def _remap_category_ids(
    transactions: list[TransactionImport], remap: dict[uuid.UUID, uuid.UUID]
) -> list[TransactionImport]:
    """Point each transaction at the category id `import_categories` resolved to."""
    return [
        t if t.category_id is None else t.model_copy(
            update={"category_id": remap.get(t.category_id, t.category_id)}
        )
        for t in transactions
    ]


async def _filter_owned_transactions(
    session: AsyncSession, user_id: uuid.UUID, transactions: list[TransactionImport]
) -> list[TransactionImport]:
    """Drop rows referencing an account/category the user doesn't own.

    Also drops rows referencing IDs that don't exist at all, so a bad ID from
    the client never reaches the DB and triggers an FK-violation 500.
    """
    account_ids = {t.account_id for t in transactions}
    category_ids = {t.category_id for t in transactions if t.category_id is not None}
    owned_accounts = await repo.get_owned_account_ids(session, user_id, account_ids)
    owned_categories = await repo.get_owned_category_ids(session, user_id, category_ids)

    filtered = [
        t
        for t in transactions
        if t.account_id in owned_accounts
        and (t.category_id is None or t.category_id in owned_categories)
    ]
    skipped = len(transactions) - len(filtered)
    if skipped:
        _logger.warning("sync_import_transactions_skipped", user_id=str(user_id), skipped=skipped)
    return filtered


async def bulk_import(
    session: AsyncSession, user_id: uuid.UUID, payload: BulkImportPayload
) -> BulkImportResult:
    # Guest default categories must merge into the user's own defaults, not
    # duplicate them, so those defaults need to exist before import_categories
    # tries to match against them (see repository.import_categories).
    if not await finance_repo.has_user_categories(session, user_id):
        await finance_service.seed_default_categories(session, user_id)

    accounts_count = await repo.import_accounts(session, user_id, payload.accounts)
    categories_count, category_remap = await repo.import_categories(
        session, user_id, payload.categories
    )
    remapped_transactions = _remap_category_ids(payload.transactions, category_remap)
    owned_transactions = await _filter_owned_transactions(session, user_id, remapped_transactions)
    inserted_transactions = await repo.import_transactions(session, user_id, owned_transactions)
    transactions_count = len(inserted_transactions)
    await _apply_balance_deltas(session, user_id, inserted_transactions)
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
