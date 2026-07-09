"""Integration tests for session history + draft rehydration against real Postgres."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.ai import repository as ai_repo
from app.domains.finance import repository as finance_repo
from app.domains.finance.models import (
    AccountType,
    CategoryType,
    TransactionSource,
    TransactionStatus,
)

pytestmark = pytest.mark.integration


async def test_pending_draft_transaction_is_rehydrated_from_history(
    client: AsyncClient, db_session: AsyncSession, test_user_id: uuid.UUID
) -> None:
    """A draft the AI created must reappear when the chat is reopened, even
    before the user confirms or cancels it — this is what makes the draft
    card visible again instead of becoming a silent orphan row."""
    chat_session = await ai_repo.create_session(db_session, test_user_id)
    account = await finance_repo.create_account(
        db_session, test_user_id, name="Dompet", type=AccountType.cash, currency="IDR"
    )
    category = await finance_repo.create_category(
        db_session, test_user_id, name="Makan", type=CategoryType.expense, icon="utensils"
    )
    await db_session.flush()
    await finance_repo.create_transaction(
        db_session,
        test_user_id,
        account_id=account.id,
        category_id=category.id,
        amount=-20_000,
        currency="IDR",
        merchant="Sate",
        occurred_at=datetime.now(UTC),
        source=TransactionSource.manual,
        status=TransactionStatus.draft,
        chat_session_id=chat_session.id,
    )
    await db_session.commit()

    response = await client.get(f"/api/v1/ai/sessions/{chat_session.id}/messages")

    assert response.status_code == 200
    drafts = response.json()["data"]["draft_transactions"]
    assert len(drafts) == 1
    assert drafts[0]["merchant"] == "Sate"
    assert drafts[0]["amount"] == -20_000
    assert drafts[0]["category_name"] == "Makan"


async def test_confirmed_transaction_is_not_returned_as_pending_draft(
    client: AsyncClient, db_session: AsyncSession, test_user_id: uuid.UUID
) -> None:
    chat_session = await ai_repo.create_session(db_session, test_user_id)
    account = await finance_repo.create_account(
        db_session, test_user_id, name="Dompet", type=AccountType.cash, currency="IDR"
    )
    await db_session.flush()
    await finance_repo.create_transaction(
        db_session,
        test_user_id,
        account_id=account.id,
        category_id=None,
        amount=-20_000,
        currency="IDR",
        occurred_at=datetime.now(UTC),
        source=TransactionSource.manual,
        status=TransactionStatus.confirmed,
        chat_session_id=chat_session.id,
    )
    await db_session.commit()

    response = await client.get(f"/api/v1/ai/sessions/{chat_session.id}/messages")

    assert response.json()["data"]["draft_transactions"] == []
