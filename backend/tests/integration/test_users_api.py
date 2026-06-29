"""Integration tests: account deletion endpoint (DELETE /api/v1/users/me)."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime
from unittest.mock import AsyncMock

import pytest
import sqlalchemy as sa
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.ai.models import ChatMessage, ChatSession
from app.domains.finance.models import (
    Account,
    AccountType,
    Budget,
    Category,
    CategoryType,
    ReceiptLog,
    SavingsGoal,
    Transaction,
    UserCategoryBudget,
    VoiceLog,
)
from app.shared.supabase_admin import get_supabase_admin

pytestmark = pytest.mark.integration

_USER_SCOPED_MODELS = (
    Account,
    Category,
    UserCategoryBudget,
    Budget,
    SavingsGoal,
    VoiceLog,
    ReceiptLog,
    Transaction,
    ChatSession,
)


async def _seed_full_user(session: AsyncSession, user_id: uuid.UUID) -> uuid.UUID:
    """Create one row per user-scoped table. Returns the chat session id."""
    account = Account(user_id=user_id, name="Dompet", type=AccountType.cash, currency="IDR")
    session.add(account)
    await session.flush()

    category = Category(user_id=user_id, name="Makan", type=CategoryType.expense)
    session.add(category)
    await session.flush()

    session.add(UserCategoryBudget(user_id=user_id, category_id=category.id, budget_limit=100_000))
    session.add(Budget(user_id=user_id, monthly_limit=5_000_000))
    session.add(SavingsGoal(user_id=user_id, name="Liburan", target_amount=1_000_000))
    session.add(VoiceLog(user_id=user_id, audio_url=f"{user_id}/audio.webm"))
    session.add(ReceiptLog(user_id=user_id, account_id=account.id, image_url=f"{user_id}/r.jpg"))
    session.add(
        Transaction(
            user_id=user_id,
            account_id=account.id,
            amount=-50_000,
            occurred_at=datetime.now(UTC),
        )
    )

    chat_session = ChatSession(user_id=user_id)
    session.add(chat_session)
    await session.flush()
    session.add(ChatMessage(session_id=chat_session.id, role="user", content="hi"))
    await session.flush()
    return chat_session.id


async def _count_user_rows(session: AsyncSession, user_id: uuid.UUID) -> int:
    total = 0
    for model in _USER_SCOPED_MODELS:
        result = await session.execute(
            sa.select(sa.func.count()).select_from(model).where(model.user_id == user_id)
        )
        total += result.scalar_one()
    return total


async def test_delete_account_removes_all_user_data_and_auth_user(
    client: AsyncClient,
    db_session: AsyncSession,
    test_user_id: uuid.UUID,
) -> None:
    other_user = uuid.uuid4()
    chat_session_id = await _seed_full_user(db_session, test_user_id)
    await _seed_full_user(db_session, other_user)
    # System-default category (shared, user_id IS NULL) must survive.
    system_category = Category(user_id=None, name="Gaji", type=CategoryType.income)
    db_session.add(system_category)
    await db_session.commit()

    fake_admin = AsyncMock()
    from app.main import app

    app.dependency_overrides[get_supabase_admin] = lambda: fake_admin

    response = await client.delete("/api/v1/users/me")

    assert response.status_code == 204
    fake_admin.delete_user.assert_awaited_once_with(test_user_id)

    await db_session.rollback()  # fresh snapshot to read the request's commit

    # All of the deleted user's data is gone.
    assert await _count_user_rows(db_session, test_user_id) == 0
    messages = await db_session.execute(
        sa.select(sa.func.count())
        .select_from(ChatMessage)
        .where(ChatMessage.session_id == chat_session_id)
    )
    assert messages.scalar_one() == 0

    # Another user's data is untouched.
    assert await _count_user_rows(db_session, other_user) == 9

    # Shared system-default category survives.
    survivor = await db_session.get(Category, system_category.id)
    assert survivor is not None


async def test_delete_account_requires_auth() -> None:
    from app.main import app

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.delete("/api/v1/users/me")

    assert response.status_code == 401
