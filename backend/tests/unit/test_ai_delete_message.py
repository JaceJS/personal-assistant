"""Unit tests for deleting a single chat message (DB mocked)."""

from __future__ import annotations

import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.core.exceptions import ForbiddenError, NotFoundError
from app.domains.ai import service
from app.domains.ai.models import ChatMessage, ChatSession

_USER_ID = uuid.uuid4()
_OTHER_USER_ID = uuid.uuid4()
_SESSION_ID = uuid.uuid4()
_MESSAGE_ID = uuid.uuid4()


def _make_db(chat_session: ChatSession | None) -> AsyncMock:
    db = AsyncMock()
    db.get = AsyncMock(return_value=chat_session)
    return db


@pytest.mark.asyncio
async def test_delete_chat_message_deletes_owned_message() -> None:
    chat_session = MagicMock(spec=ChatSession)
    chat_session.user_id = _USER_ID
    db = _make_db(chat_session)
    message = MagicMock(spec=ChatMessage)
    message.session_id = _SESSION_ID

    with (
        patch("app.domains.ai.service.repo.get_message", AsyncMock(return_value=message)),
        patch("app.domains.ai.service.repo.delete_message", AsyncMock()) as delete_mock,
    ):
        await service.delete_chat_message(_USER_ID, _SESSION_ID, _MESSAGE_ID, db)

    delete_mock.assert_awaited_once_with(db, message)


@pytest.mark.asyncio
async def test_delete_chat_message_raises_not_found_when_session_missing() -> None:
    db = _make_db(None)

    with pytest.raises(NotFoundError):
        await service.delete_chat_message(_USER_ID, _SESSION_ID, _MESSAGE_ID, db)


@pytest.mark.asyncio
async def test_delete_chat_message_raises_forbidden_when_not_owner() -> None:
    chat_session = MagicMock(spec=ChatSession)
    chat_session.user_id = _OTHER_USER_ID
    db = _make_db(chat_session)

    with pytest.raises(ForbiddenError):
        await service.delete_chat_message(_USER_ID, _SESSION_ID, _MESSAGE_ID, db)


@pytest.mark.asyncio
async def test_delete_chat_message_raises_not_found_when_message_missing() -> None:
    chat_session = MagicMock(spec=ChatSession)
    chat_session.user_id = _USER_ID
    db = _make_db(chat_session)

    with (
        patch("app.domains.ai.service.repo.get_message", AsyncMock(return_value=None)),
        pytest.raises(NotFoundError),
    ):
        await service.delete_chat_message(_USER_ID, _SESSION_ID, _MESSAGE_ID, db)


@pytest.mark.asyncio
async def test_delete_chat_message_raises_not_found_when_message_belongs_to_other_session() -> (
    None
):
    """A message id that's real but belongs to a different session must not be
    deletable through this session's URL — otherwise any authenticated user
    could delete any message by guessing/enumerating message ids as long as
    they own *some* session."""
    chat_session = MagicMock(spec=ChatSession)
    chat_session.user_id = _USER_ID
    db = _make_db(chat_session)
    message = MagicMock(spec=ChatMessage)
    message.session_id = uuid.uuid4()

    with (
        patch("app.domains.ai.service.repo.get_message", AsyncMock(return_value=message)),
        pytest.raises(NotFoundError),
    ):
        await service.delete_chat_message(_USER_ID, _SESSION_ID, _MESSAGE_ID, db)
