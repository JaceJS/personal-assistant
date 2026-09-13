"""Unit tests for transaction creation service logic (no DB needed)."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.core.exceptions import ConflictError
from app.domains.finance import service as finance_service
from app.domains.finance.models import Account, AccountType, Transaction, TransactionStatus
from app.domains.finance.schemas import TransactionCreate

_USER_ID = uuid.uuid4()
_ACCOUNT_ID = uuid.uuid4()
_CHAT_SESSION_ID = uuid.uuid4()
_TURN_START = datetime(2026, 1, 1, 12, 0, 0, tzinfo=UTC)


def _make_account() -> Account:
    account = MagicMock(spec=Account)
    account.id = _ACCOUNT_ID
    account.user_id = _USER_ID
    account.type = AccountType.cash
    account.balance = 1_000_000
    return account


def _make_pending_draft(
    merchant: str, amount: int, *, note: str | None = None, created_at: datetime | None = None
) -> Transaction:
    tx = MagicMock(spec=Transaction)
    tx.merchant = merchant
    tx.amount = amount
    tx.note = note
    tx.created_at = created_at or (_TURN_START - timedelta(minutes=5))
    return tx


def _make_draft(
    *,
    merchant: str | None = "Kopi",
    amount: int = -10_000,
    note: str | None = None,
    status: TransactionStatus = TransactionStatus.draft,
    chat_session_id: uuid.UUID | None = _CHAT_SESSION_ID,
) -> TransactionCreate:
    return TransactionCreate(
        account_id=_ACCOUNT_ID,
        amount=amount,
        merchant=merchant,
        note=note,
        occurred_at=datetime.now(UTC),
        status=status,
        chat_session_id=chat_session_id,
    )


@pytest.fixture
def mock_repo():
    with patch("app.domains.finance.service.repo") as repo:
        repo.get_transaction = AsyncMock(return_value=None)
        repo.get_account_for_update = AsyncMock(return_value=_make_account())
        repo.get_pending_draft_transactions = AsyncMock(return_value=[])
        repo.create_transaction = AsyncMock(return_value=MagicMock(spec=Transaction))
        repo.update_account = AsyncMock()
        yield repo


async def test_raises_conflict_for_matching_pending_draft_from_a_prior_turn(mock_repo) -> None:
    """A draft from BEFORE this turn (dedupe_before) with the same merchant,
    amount, and note is a real re-create hallucination — still blocked."""
    mock_repo.get_pending_draft_transactions.return_value = [
        _make_pending_draft("Kopi", -10_000, created_at=_TURN_START - timedelta(minutes=5))
    ]

    with pytest.raises(ConflictError):
        await finance_service.create_transaction(
            AsyncMock(), _USER_ID, _make_draft(), dedupe_before=_TURN_START
        )

    mock_repo.create_transaction.assert_not_called()


async def test_allows_different_merchant(mock_repo) -> None:
    mock_repo.get_pending_draft_transactions.return_value = [
        _make_pending_draft("Kopi", -10_000, created_at=_TURN_START - timedelta(minutes=5))
    ]

    await finance_service.create_transaction(
        AsyncMock(),
        _USER_ID,
        _make_draft(merchant="Makan", amount=-30_000),
        dedupe_before=_TURN_START,
    )

    mock_repo.create_transaction.assert_called_once()


async def test_allows_different_amount(mock_repo) -> None:
    mock_repo.get_pending_draft_transactions.return_value = [
        _make_pending_draft("Kopi", -10_000, created_at=_TURN_START - timedelta(minutes=5))
    ]

    await finance_service.create_transaction(
        AsyncMock(),
        _USER_ID,
        _make_draft(merchant="Kopi", amount=-15_000),
        dedupe_before=_TURN_START,
    )

    mock_repo.create_transaction.assert_called_once()


async def test_allows_same_amount_different_note_same_turn(mock_repo) -> None:
    """'kopi 15rb' + 'es teh 15rb' in one message — same amount, no merchant,
    different note — must both succeed (Bug 3: was silently collapsing)."""
    mock_repo.get_pending_draft_transactions.return_value = [
        _make_pending_draft(
            "", -15_000, note="kopi", created_at=_TURN_START + timedelta(seconds=1)
        )
    ]

    await finance_service.create_transaction(
        AsyncMock(),
        _USER_ID,
        _make_draft(merchant=None, amount=-15_000, note="es teh"),
        dedupe_before=_TURN_START,
    )

    mock_repo.create_transaction.assert_called_once()


async def test_allows_same_name_and_price_repeated_in_same_turn(mock_repo) -> None:
    """Two separate 'kopi 15rb' items in the same message — identical
    merchant/amount/note, but both created THIS turn (after dedupe_before) —
    must both succeed, matching the prompt's 'people buy the same thing more
    than once' instruction."""
    mock_repo.get_pending_draft_transactions.return_value = [
        _make_pending_draft(
            "", -15_000, note="kopi", created_at=_TURN_START + timedelta(seconds=1)
        )
    ]

    await finance_service.create_transaction(
        AsyncMock(),
        _USER_ID,
        _make_draft(merchant=None, amount=-15_000, note="kopi"),
        dedupe_before=_TURN_START,
    )

    mock_repo.create_transaction.assert_called_once()


async def test_blocks_identical_redo_from_a_prior_turn(mock_repo) -> None:
    """The original anti-hallucination case commit 341d2f4a fixed: model
    re-creates the exact same item it already drafted in an EARLIER turn."""
    mock_repo.get_pending_draft_transactions.return_value = [
        _make_pending_draft(
            "", -15_000, note="kopi", created_at=_TURN_START - timedelta(minutes=10)
        )
    ]

    with pytest.raises(ConflictError):
        await finance_service.create_transaction(
            AsyncMock(),
            _USER_ID,
            _make_draft(merchant=None, amount=-15_000, note="kopi"),
            dedupe_before=_TURN_START,
        )


async def test_no_dedupe_before_falls_back_to_checking_all_pending(mock_repo) -> None:
    """Callers that don't pass dedupe_before (non-AI callers, if any) keep
    the old session-wide behavior."""
    mock_repo.get_pending_draft_transactions.return_value = [_make_pending_draft("Kopi", -10_000)]

    with pytest.raises(ConflictError):
        await finance_service.create_transaction(AsyncMock(), _USER_ID, _make_draft())


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


# ── create_transaction (client-supplied id, offline-first sync) ────────────────


async def test_create_transaction_without_id_lets_db_generate_one(mock_repo) -> None:
    await finance_service.create_transaction(AsyncMock(), _USER_ID, _make_draft())

    mock_repo.get_transaction.assert_not_called()
    _, kwargs = mock_repo.create_transaction.call_args
    assert "id" not in kwargs


async def test_create_transaction_with_client_id_passes_it_through(mock_repo) -> None:
    client_id = uuid.uuid4()
    data = _make_draft().model_copy(update={"id": client_id})

    await finance_service.create_transaction(AsyncMock(), _USER_ID, data)

    _, kwargs = mock_repo.create_transaction.call_args
    assert kwargs["id"] == client_id


async def test_create_transaction_retry_with_same_id_is_idempotent(mock_repo) -> None:
    """A retried push must not double-apply the account balance delta."""
    client_id = uuid.uuid4()
    existing = MagicMock(spec=Transaction)
    existing.user_id = _USER_ID
    mock_repo.get_transaction.return_value = existing
    data = _make_draft(status=TransactionStatus.confirmed).model_copy(update={"id": client_id})

    result = await finance_service.create_transaction(AsyncMock(), _USER_ID, data)

    assert result is existing
    mock_repo.create_transaction.assert_not_called()
    mock_repo.update_account.assert_not_called()


async def test_create_transaction_id_owned_by_another_user_raises_conflict(mock_repo) -> None:
    client_id = uuid.uuid4()
    other_users_tx = MagicMock(spec=Transaction)
    other_users_tx.user_id = uuid.uuid4()
    mock_repo.get_transaction.return_value = other_users_tx
    data = _make_draft().model_copy(update={"id": client_id})

    with pytest.raises(ConflictError):
        await finance_service.create_transaction(AsyncMock(), _USER_ID, data)
