"""Integration tests for deleting a single chat message against real Postgres."""

from __future__ import annotations

import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.ai import repository as ai_repo

pytestmark = pytest.mark.integration


async def test_delete_message_removes_it_from_session_history(
    client: AsyncClient, db_session: AsyncSession, test_user_id: uuid.UUID
) -> None:
    chat_session = await ai_repo.create_session(db_session, test_user_id)
    message = await ai_repo.add_message(db_session, chat_session.id, "user", "halo")
    await db_session.commit()

    response = await client.delete(
        f"/api/v1/ai/sessions/{chat_session.id}/messages/{message.id}"
    )
    assert response.status_code == 204

    history = await client.get(f"/api/v1/ai/sessions/{chat_session.id}/messages")
    assert history.json()["data"]["messages"] == []


async def test_delete_message_for_a_session_owned_by_another_user_is_forbidden(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    other_user_id = uuid.uuid4()
    chat_session = await ai_repo.create_session(db_session, other_user_id)
    message = await ai_repo.add_message(db_session, chat_session.id, "user", "halo")
    await db_session.commit()

    response = await client.delete(
        f"/api/v1/ai/sessions/{chat_session.id}/messages/{message.id}"
    )

    assert response.status_code == 403


async def test_delete_nonexistent_message_returns_404(
    client: AsyncClient, db_session: AsyncSession, test_user_id: uuid.UUID
) -> None:
    chat_session = await ai_repo.create_session(db_session, test_user_id)
    await db_session.commit()

    response = await client.delete(
        f"/api/v1/ai/sessions/{chat_session.id}/messages/{uuid.uuid4()}"
    )

    assert response.status_code == 404
