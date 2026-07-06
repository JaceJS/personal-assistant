"""Bulk deletion of all data owned by a user."""

from __future__ import annotations

import uuid

import sqlalchemy as sa
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.ai.models import ChatSession
from app.domains.finance.models import (
    Account,
    Budget,
    Category,
    ReceiptLog,
    SavingsGoal,
    Transaction,
    UserCategoryBudget,
    VoiceLog,
)


async def delete_all_user_data(session: AsyncSession, user_id: uuid.UUID) -> list[str]:
    """Delete all rows owned by `user_id`; return R2 object keys left behind.

    Storage keys must be read before the rows are deleted, since the caller
    needs them afterward to clean up R2 (voice recordings, receipt photos).
    """
    voice_urls = await session.execute(
        sa.select(VoiceLog.audio_url).where(VoiceLog.user_id == user_id)
    )
    receipt_urls = await session.execute(
        sa.select(ReceiptLog.image_url).where(ReceiptLog.user_id == user_id)
    )
    storage_keys = [*voice_urls.scalars().all(), *receipt_urls.scalars().all()]

    # receipt_logs and transactions RESTRICT deletion of accounts, so they go
    # first. System-default categories (user_id IS NULL) are kept; deleting a
    # chat_session cascades to its chat_messages.
    await session.execute(sa.delete(ReceiptLog).where(ReceiptLog.user_id == user_id))
    await session.execute(sa.delete(Transaction).where(Transaction.user_id == user_id))
    await session.execute(sa.delete(VoiceLog).where(VoiceLog.user_id == user_id))
    await session.execute(sa.delete(SavingsGoal).where(SavingsGoal.user_id == user_id))
    await session.execute(sa.delete(Budget).where(Budget.user_id == user_id))
    await session.execute(
        sa.delete(UserCategoryBudget).where(UserCategoryBudget.user_id == user_id)
    )
    await session.execute(sa.delete(Category).where(Category.user_id == user_id))
    await session.execute(sa.delete(Account).where(Account.user_id == user_id))
    await session.execute(sa.delete(ChatSession).where(ChatSession.user_id == user_id))
    await session.flush()
    return storage_keys
