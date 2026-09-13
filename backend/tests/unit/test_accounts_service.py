"""Unit tests for account service logic (no DB needed)."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.core.exceptions import ConflictError, ForbiddenError, NotFoundError
from app.domains.finance import service as finance_service
from app.domains.finance.models import Account, AccountType
from app.domains.finance.schemas import AccountCreate, AccountUpdate

_USER_ID = uuid.uuid4()
_OTHER_USER_ID = uuid.uuid4()
_ACCOUNT_ID = uuid.uuid4()


def _make_session() -> AsyncMock:
    return AsyncMock()


def _make_account(
    *,
    user_id: uuid.UUID = _USER_ID,
    name: str = "Akun Utama",
    account_type: AccountType = AccountType.cash,
    initial_balance: int = 0,
    balance: int = 0,
    is_archived: bool = False,
) -> Account:
    account = MagicMock(spec=Account)
    account.id = _ACCOUNT_ID
    account.user_id = user_id
    account.name = name
    account.type = account_type
    account.currency = "IDR"
    account.initial_balance = initial_balance
    account.balance = balance
    account.is_archived = is_archived
    account.created_at = datetime.now(UTC)
    account.updated_at = datetime.now(UTC)
    return account


# ── update_account ──────────────────────────────────────────────────────────


async def test_update_account_raises_not_found_when_missing() -> None:
    session = _make_session()

    with patch("app.domains.finance.service.repo") as mock_repo:
        mock_repo.get_account = AsyncMock(return_value=None)

        with pytest.raises(NotFoundError):
            await finance_service.update_account(
                session, _USER_ID, _ACCOUNT_ID, AccountUpdate(name="Baru")
            )


async def test_update_account_raises_forbidden_for_wrong_owner() -> None:
    session = _make_session()
    account = _make_account(user_id=_OTHER_USER_ID)

    with patch("app.domains.finance.service.repo") as mock_repo:
        mock_repo.get_account = AsyncMock(return_value=account)

        with pytest.raises(ForbiddenError):
            await finance_service.update_account(
                session, _USER_ID, _ACCOUNT_ID, AccountUpdate(name="Baru")
            )


async def test_update_account_name_only_does_not_touch_balance() -> None:
    session = _make_session()
    account = _make_account(initial_balance=100_000, balance=150_000)

    with patch("app.domains.finance.service.repo") as mock_repo:
        mock_repo.get_account = AsyncMock(return_value=account)
        mock_repo.update_account = AsyncMock(return_value=account)

        await finance_service.update_account(
            session, _USER_ID, _ACCOUNT_ID, AccountUpdate(name="BCA")
        )

    mock_repo.update_account.assert_called_once_with(session, account, name="BCA")


async def test_update_account_initial_balance_shifts_balance_by_delta() -> None:
    """Correcting the starting balance must preserve every transaction already
    applied on top of it: shift `balance` by the same delta, not overwrite it."""
    session = _make_session()
    # Account started at 0, then 3 confirmed transactions brought balance to 50_000.
    account = _make_account(initial_balance=0, balance=50_000)

    with patch("app.domains.finance.service.repo") as mock_repo:
        mock_repo.get_account = AsyncMock(return_value=account)
        mock_repo.update_account = AsyncMock(return_value=account)

        await finance_service.update_account(
            session, _USER_ID, _ACCOUNT_ID, AccountUpdate(initial_balance=200_000)
        )

    mock_repo.update_account.assert_called_once_with(
        session, account, initial_balance=200_000, balance=250_000
    )


# ── create_account (client-supplied id, offline-first sync) ────────────────────


async def test_create_account_without_id_lets_db_generate_one() -> None:
    session = _make_session()
    data = AccountCreate(name="Wallet", type=AccountType.cash)

    with patch("app.domains.finance.service.repo") as mock_repo:
        mock_repo.get_account = AsyncMock(return_value=None)
        mock_repo.create_account = AsyncMock(return_value=_make_account())

        await finance_service.create_account(session, _USER_ID, data)

    mock_repo.get_account.assert_not_called()
    _, kwargs = mock_repo.create_account.call_args
    assert "id" not in kwargs


async def test_create_account_with_client_id_passes_it_through() -> None:
    session = _make_session()
    client_id = uuid.uuid4()
    data = AccountCreate(id=client_id, name="Wallet", type=AccountType.cash)

    with patch("app.domains.finance.service.repo") as mock_repo:
        mock_repo.get_account = AsyncMock(return_value=None)
        mock_repo.create_account = AsyncMock(return_value=_make_account())

        await finance_service.create_account(session, _USER_ID, data)

    _, kwargs = mock_repo.create_account.call_args
    assert kwargs["id"] == client_id


async def test_create_account_retry_with_same_id_is_idempotent() -> None:
    """Client retries a push (e.g. response was lost) with the same id: return
    the already-created row instead of erroring or double-creating."""
    session = _make_session()
    client_id = uuid.uuid4()
    existing = _make_account()
    data = AccountCreate(id=client_id, name="Wallet", type=AccountType.cash)

    with patch("app.domains.finance.service.repo") as mock_repo:
        mock_repo.get_account = AsyncMock(return_value=existing)
        mock_repo.create_account = AsyncMock()

        result = await finance_service.create_account(session, _USER_ID, data)

    assert result is existing
    mock_repo.create_account.assert_not_called()


async def test_create_account_id_owned_by_another_user_raises_conflict() -> None:
    session = _make_session()
    client_id = uuid.uuid4()
    other_users_account = _make_account(user_id=_OTHER_USER_ID)
    data = AccountCreate(id=client_id, name="Wallet", type=AccountType.cash)

    with patch("app.domains.finance.service.repo") as mock_repo:
        mock_repo.get_account = AsyncMock(return_value=other_users_account)

        with pytest.raises(ConflictError):
            await finance_service.create_account(session, _USER_ID, data)
