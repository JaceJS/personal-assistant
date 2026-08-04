"""Unit tests for session history + draft transaction rehydration (DB mocked)."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.domains.ai import service
from app.domains.ai.models import ChatSession
from app.domains.finance.models import TransactionStatus

_USER_ID = uuid.uuid4()
_SESSION_ID = uuid.uuid4()


def _make_db(chat_session: ChatSession | None) -> AsyncMock:
    db = AsyncMock()
    db.get = AsyncMock(return_value=chat_session)
    return db


def _make_draft_transaction_row(
    *,
    amount: int = -20_000,
    category_id: uuid.UUID | None = None,
    status: TransactionStatus = TransactionStatus.draft,
) -> MagicMock:
    tx = MagicMock()
    tx.id = uuid.uuid4()
    tx.amount = amount
    tx.currency = "IDR"
    tx.merchant = "Sate"
    tx.note = None
    tx.account_id = uuid.uuid4()
    tx.category_id = category_id
    tx.status = status
    tx.created_at = datetime.now(UTC)
    return tx


@pytest.mark.asyncio
async def test_get_session_messages_rehydrates_pending_drafts() -> None:
    chat_session = MagicMock(spec=ChatSession)
    chat_session.user_id = _USER_ID
    db = _make_db(chat_session)
    draft_row = _make_draft_transaction_row()

    with (
        patch("app.domains.ai.service.repo.get_recent_messages", AsyncMock(return_value=[])),
        patch(
            "app.domains.ai.service.finance_repo.get_session_transactions",
            AsyncMock(return_value=[draft_row]),
        ),
    ):
        _, drafts = await service.get_session_messages(_USER_ID, _SESSION_ID, db)

    assert len(drafts) == 1
    assert drafts[0].transaction_id == draft_row.id
    assert drafts[0].amount == -20_000
    assert drafts[0].category_name is None
    assert drafts[0].status == TransactionStatus.draft


@pytest.mark.asyncio
async def test_get_session_messages_resolves_category_name_for_drafts() -> None:
    chat_session = MagicMock(spec=ChatSession)
    chat_session.user_id = _USER_ID
    db = _make_db(chat_session)
    category_id = uuid.uuid4()
    draft_row = _make_draft_transaction_row(category_id=category_id)
    category = MagicMock()
    category.name = "Makan"

    with (
        patch("app.domains.ai.service.repo.get_recent_messages", AsyncMock(return_value=[])),
        patch(
            "app.domains.ai.service.finance_repo.get_session_transactions",
            AsyncMock(return_value=[draft_row]),
        ),
        patch(
            "app.domains.ai.service.finance_repo.get_category",
            AsyncMock(return_value=category),
        ),
    ):
        _, drafts = await service.get_session_messages(_USER_ID, _SESSION_ID, db)

    assert drafts[0].category_name == "Makan"


@pytest.mark.asyncio
async def test_get_session_messages_no_session_transactions_returns_empty_list() -> None:
    chat_session = MagicMock(spec=ChatSession)
    chat_session.user_id = _USER_ID
    db = _make_db(chat_session)

    with (
        patch("app.domains.ai.service.repo.get_recent_messages", AsyncMock(return_value=[])),
        patch(
            "app.domains.ai.service.finance_repo.get_session_transactions",
            AsyncMock(return_value=[]),
        ),
    ):
        _, drafts = await service.get_session_messages(_USER_ID, _SESSION_ID, db)

    assert drafts == []


@pytest.mark.asyncio
async def test_get_session_messages_includes_confirmed_and_cancelled_drafts() -> None:
    chat_session = MagicMock(spec=ChatSession)
    chat_session.user_id = _USER_ID
    db = _make_db(chat_session)
    confirmed_row = _make_draft_transaction_row(status=TransactionStatus.confirmed)
    cancelled_row = _make_draft_transaction_row(status=TransactionStatus.cancelled)

    with (
        patch("app.domains.ai.service.repo.get_recent_messages", AsyncMock(return_value=[])),
        patch(
            "app.domains.ai.service.finance_repo.get_session_transactions",
            AsyncMock(return_value=[confirmed_row, cancelled_row]),
        ),
    ):
        _, drafts = await service.get_session_messages(_USER_ID, _SESSION_ID, db)

    assert [d.status for d in drafts] == [
        TransactionStatus.confirmed,
        TransactionStatus.cancelled,
    ]
