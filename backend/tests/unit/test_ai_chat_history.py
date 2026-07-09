"""Unit tests for session history + pending draft rehydration (DB mocked)."""

from __future__ import annotations

import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.domains.ai import service
from app.domains.ai.models import ChatSession

_USER_ID = uuid.uuid4()
_SESSION_ID = uuid.uuid4()


def _make_db(chat_session: ChatSession | None) -> AsyncMock:
    db = AsyncMock()
    db.get = AsyncMock(return_value=chat_session)
    return db


def _make_draft_transaction_row(
    *, amount: int = -20_000, category_id: uuid.UUID | None = None
) -> MagicMock:
    tx = MagicMock()
    tx.id = uuid.uuid4()
    tx.amount = amount
    tx.currency = "IDR"
    tx.merchant = "Sate"
    tx.note = None
    tx.account_id = uuid.uuid4()
    tx.category_id = category_id
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
            "app.domains.ai.service.finance_repo.get_pending_draft_transactions",
            AsyncMock(return_value=[draft_row]),
        ),
    ):
        _, drafts = await service.get_session_messages(_USER_ID, _SESSION_ID, db)

    assert len(drafts) == 1
    assert drafts[0].transaction_id == draft_row.id
    assert drafts[0].amount == -20_000
    assert drafts[0].category_name is None


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
            "app.domains.ai.service.finance_repo.get_pending_draft_transactions",
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
async def test_get_session_messages_no_pending_drafts_returns_empty_list() -> None:
    chat_session = MagicMock(spec=ChatSession)
    chat_session.user_id = _USER_ID
    db = _make_db(chat_session)

    with (
        patch("app.domains.ai.service.repo.get_recent_messages", AsyncMock(return_value=[])),
        patch(
            "app.domains.ai.service.finance_repo.get_pending_draft_transactions",
            AsyncMock(return_value=[]),
        ),
    ):
        _, drafts = await service.get_session_messages(_USER_ID, _SESSION_ID, db)

    assert drafts == []
