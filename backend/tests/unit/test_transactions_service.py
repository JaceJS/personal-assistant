"""Unit tests for transaction creation service logic (no DB needed)."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.core.exceptions import ConflictError
from app.domains.finance import service as finance_service
from app.domains.finance.models import Account, AccountType, Transaction, TransactionStatus
from app.domains.finance.schemas import TransactionCreate

_USER_ID = uuid.uuid4()
_ACCOUNT_ID = uuid.uuid4()
_CHAT_SESSION_ID = uuid.uuid4()


def _make_account() -> Account:
    account = MagicMock(spec=Account)
    account.id = _ACCOUNT_ID
    account.user_id = _USER_ID
    account.type = AccountType.cash
    account.balance = 1_000_000
    return account


def _make_pending_draft(merchant: str, amount: int) -> Transaction:
    tx = MagicMock(spec=Transaction)
    tx.merchant = merchant
    tx.amount = amount
    return tx


def _make_draft(
    *,
    merchant: str | None = "Kopi",
    amount: int = -10_000,
    status: TransactionStatus = TransactionStatus.draft,
    chat_session_id: uuid.UUID | None = _CHAT_SESSION_ID,
) -> TransactionCreate:
    return TransactionCreate(
        account_id=_ACCOUNT_ID,
        amount=amount,
        merchant=merchant,
        occurred_at=datetime.now(UTC),
        status=status,
        chat_session_id=chat_session_id,
    )


@pytest.fixture
def mock_repo():
    with patch("app.domains.finance.service.repo") as repo:
        repo.get_account_for_update = AsyncMock(return_value=_make_account())
        repo.get_pending_draft_transactions = AsyncMock(return_value=[])
        repo.create_transaction = AsyncMock(return_value=MagicMock(spec=Transaction))
        repo.update_account = AsyncMock()
        yield repo


async def test_raises_conflict_for_matching_pending_draft(mock_repo) -> None:
    mock_repo.get_pending_draft_transactions.return_value = [_make_pending_draft("Kopi", -10_000)]

    with pytest.raises(ConflictError):
        await finance_service.create_transaction(AsyncMock(), _USER_ID, _make_draft())

    mock_repo.create_transaction.assert_not_called()


async def test_allows_different_merchant(mock_repo) -> None:
    mock_repo.get_pending_draft_transactions.return_value = [_make_pending_draft("Kopi", -10_000)]

    await finance_service.create_transaction(
        AsyncMock(), _USER_ID, _make_draft(merchant="Makan", amount=-30_000)
    )

    mock_repo.create_transaction.assert_called_once()


async def test_allows_different_amount(mock_repo) -> None:
    mock_repo.get_pending_draft_transactions.return_value = [_make_pending_draft("Kopi", -10_000)]

    await finance_service.create_transaction(
        AsyncMock(), _USER_ID, _make_draft(merchant="Kopi", amount=-15_000)
    )

    mock_repo.create_transaction.assert_called_once()


async def test_skips_dedupe_check_without_chat_session(mock_repo) -> None:
    await finance_service.create_transaction(
        AsyncMock(), _USER_ID, _make_draft(chat_session_id=None)
    )

    mock_repo.get_pending_draft_transactions.assert_not_called()
    mock_repo.create_transaction.assert_called_once()


async def test_skips_dedupe_check_for_confirmed_status(mock_repo) -> None:
    await finance_service.create_transaction(
        AsyncMock(), _USER_ID, _make_draft(status=TransactionStatus.confirmed)
    )

    mock_repo.get_pending_draft_transactions.assert_not_called()
    mock_repo.create_transaction.assert_called_once()
