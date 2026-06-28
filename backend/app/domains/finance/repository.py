"""Finance domain repository with plain async query functions and no generic base."""

from __future__ import annotations

import uuid
from datetime import date
from typing import Any

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.finance.models import (
    Account,
    Budget,
    Category,
    ReceiptLog,
    SavingsGoal,
    Transaction,
    TransactionStatus,
    UserCategoryBudget,
    VoiceLog,
    VoiceProcessingStatus,
)

# ── Savings Goals ─────────────────────────────────────────────────────────────


async def list_savings_goals(session: AsyncSession, user_id: uuid.UUID) -> list[SavingsGoal]:
    result = await session.execute(
        sa.select(SavingsGoal)
        .where(SavingsGoal.user_id == user_id, SavingsGoal.is_archived.is_(False))
        .order_by(SavingsGoal.created_at.desc())
    )
    return list(result.scalars())


async def get_savings_goal(session: AsyncSession, goal_id: uuid.UUID) -> SavingsGoal | None:
    return await session.get(SavingsGoal, goal_id)


async def create_savings_goal(
    session: AsyncSession, user_id: uuid.UUID, **kwargs: Any
) -> SavingsGoal:
    goal = SavingsGoal(user_id=user_id, **kwargs)
    session.add(goal)
    await session.flush()
    return goal


async def update_savings_goal(
    session: AsyncSession, goal: SavingsGoal, **kwargs: Any
) -> SavingsGoal:
    for key, value in kwargs.items():
        setattr(goal, key, value)
    await session.flush()
    await session.refresh(goal)
    return goal


# ── Budget ────────────────────────────────────────────────────────────────────


async def get_budget(session: AsyncSession, user_id: uuid.UUID) -> Budget | None:
    result = await session.execute(sa.select(Budget).where(Budget.user_id == user_id))
    return result.scalar_one_or_none()


async def upsert_budget(session: AsyncSession, user_id: uuid.UUID, monthly_limit: int) -> Budget:
    stmt = (
        pg_insert(Budget)
        .values(user_id=user_id, monthly_limit=monthly_limit)
        .on_conflict_do_update(
            index_elements=["user_id"],
            set_={"monthly_limit": monthly_limit, "updated_at": sa.func.now()},
        )
        .returning(Budget)
    )
    result = await session.execute(stmt)
    await session.flush()
    return result.scalar_one()


# ── Accounts ──────────────────────────────────────────────────────────────────


async def get_account(session: AsyncSession, account_id: uuid.UUID) -> Account | None:
    return await session.get(Account, account_id)


async def list_accounts(session: AsyncSession, user_id: uuid.UUID) -> list[Account]:
    result = await session.execute(
        sa.select(Account).where(Account.user_id == user_id, Account.is_archived.is_(False))
    )
    return list(result.scalars())


async def create_account(session: AsyncSession, user_id: uuid.UUID, **kwargs: Any) -> Account:
    account = Account(user_id=user_id, **kwargs)
    session.add(account)
    await session.flush()
    return account


async def update_account(session: AsyncSession, account: Account, **kwargs: Any) -> Account:
    for key, value in kwargs.items():
        setattr(account, key, value)
    await session.flush()
    await session.refresh(account)
    return account


# ── Categories ────────────────────────────────────────────────────────────────


async def get_category(session: AsyncSession, category_id: uuid.UUID) -> Category | None:
    return await session.get(Category, category_id)


async def list_categories(session: AsyncSession, user_id: uuid.UUID) -> list[Category]:
    result = await session.execute(
        sa.select(Category).where(
            Category.user_id == user_id,
            Category.is_archived.is_(False),
        )
    )
    return list(result.scalars())


async def has_user_categories(session: AsyncSession, user_id: uuid.UUID) -> bool:
    result = await session.execute(
        sa.select(sa.func.count()).select_from(Category).where(Category.user_id == user_id)
    )
    return (result.scalar() or 0) > 0


async def list_system_categories(session: AsyncSession) -> list[Category]:
    result = await session.execute(
        sa.select(Category).where(
            Category.user_id.is_(None),
            Category.is_archived.is_(False),
        )
    )
    return list(result.scalars())


async def create_category(session: AsyncSession, user_id: uuid.UUID, **kwargs: Any) -> Category:
    category = Category(user_id=user_id, **kwargs)
    session.add(category)
    await session.flush()
    return category


async def update_category(session: AsyncSession, category: Category, **kwargs: Any) -> Category:
    for key, value in kwargs.items():
        setattr(category, key, value)
    await session.flush()
    await session.refresh(category)
    return category


async def archive_category(session: AsyncSession, category: Category) -> None:
    category.is_archived = True
    await session.flush()


async def get_user_category_budget(
    session: AsyncSession, user_id: uuid.UUID, category_id: uuid.UUID
) -> UserCategoryBudget | None:
    result = await session.execute(
        sa.select(UserCategoryBudget).where(
            UserCategoryBudget.user_id == user_id,
            UserCategoryBudget.category_id == category_id,
        )
    )
    return result.scalar_one_or_none()


async def get_user_category_budgets_map(
    session: AsyncSession, user_id: uuid.UUID
) -> dict[uuid.UUID, UserCategoryBudget]:
    result = await session.execute(
        sa.select(UserCategoryBudget).where(UserCategoryBudget.user_id == user_id)
    )
    return {ucb.category_id: ucb for ucb in result.scalars()}


async def upsert_user_category_budget(
    session: AsyncSession,
    user_id: uuid.UUID,
    category_id: uuid.UUID,
    *,
    budget_limit: int | None,
    is_fixed: bool,
) -> UserCategoryBudget:
    stmt = (
        pg_insert(UserCategoryBudget)
        .values(
            user_id=user_id,
            category_id=category_id,
            budget_limit=budget_limit,
            is_fixed=is_fixed,
        )
        .on_conflict_do_update(
            constraint="user_category_budgets_user_id_category_id_key",
            set_={"budget_limit": budget_limit, "is_fixed": is_fixed, "updated_at": sa.func.now()},
        )
        .returning(UserCategoryBudget)
    )
    result = await session.execute(stmt)
    await session.flush()
    ucb = result.scalar_one()
    # pg_insert RETURNING may resolve to a stale identity-map object; refresh for correct values.
    await session.refresh(ucb)
    return ucb


# ── Transactions ──────────────────────────────────────────────────────────────


async def get_transaction(session: AsyncSession, tx_id: uuid.UUID) -> Transaction | None:
    return await session.get(Transaction, tx_id)


async def get_transaction_by_voice_log(
    session: AsyncSession, voice_log_id: uuid.UUID
) -> Transaction | None:
    result = await session.execute(
        sa.select(Transaction).where(Transaction.voice_log_id == voice_log_id)
    )
    return result.scalar_one_or_none()


async def list_transactions(
    session: AsyncSession,
    user_id: uuid.UUID,
    *,
    account_id: uuid.UUID | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    search: str | None = None,
    status: TransactionStatus | None = None,
    limit: int = 50,
    offset: int = 0,
) -> list[Transaction]:
    q = sa.select(Transaction).where(Transaction.user_id == user_id)
    if account_id is not None:
        q = q.where(Transaction.account_id == account_id)
    if date_from is not None:
        q = q.where(
            sa.cast(sa.func.timezone("Asia/Jakarta", Transaction.occurred_at), sa.Date) >= date_from
        )
    if date_to is not None:
        q = q.where(
            sa.cast(sa.func.timezone("Asia/Jakarta", Transaction.occurred_at), sa.Date) <= date_to
        )
    if search is not None:
        pattern = f"%{search}%"
        q = q.where(
            sa.or_(
                Transaction.merchant.ilike(pattern),
                Transaction.note.ilike(pattern),
            )
        )
    if status is not None:
        q = q.where(Transaction.status == status)
    q = q.order_by(Transaction.occurred_at.desc()).limit(limit).offset(offset)
    result = await session.execute(q)
    return list(result.scalars())


async def count_transactions(
    session: AsyncSession,
    user_id: uuid.UUID,
    *,
    account_id: uuid.UUID | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    search: str | None = None,
    status: TransactionStatus | None = None,
) -> int:
    q = sa.select(sa.func.count()).select_from(Transaction).where(Transaction.user_id == user_id)
    if account_id is not None:
        q = q.where(Transaction.account_id == account_id)
    if date_from is not None:
        q = q.where(
            sa.cast(sa.func.timezone("Asia/Jakarta", Transaction.occurred_at), sa.Date) >= date_from
        )
    if date_to is not None:
        q = q.where(
            sa.cast(sa.func.timezone("Asia/Jakarta", Transaction.occurred_at), sa.Date) <= date_to
        )
    if search is not None:
        pattern = f"%{search}%"
        q = q.where(
            sa.or_(
                Transaction.merchant.ilike(pattern),
                Transaction.note.ilike(pattern),
            )
        )
    if status is not None:
        q = q.where(Transaction.status == status)
    result = await session.execute(q)
    return result.scalar_one()


async def create_transaction(
    session: AsyncSession, user_id: uuid.UUID, **kwargs: Any
) -> Transaction:
    tx = Transaction(user_id=user_id, **kwargs)
    session.add(tx)
    await session.flush()
    return tx


async def update_transaction(session: AsyncSession, tx: Transaction, **kwargs: Any) -> Transaction:
    for key, value in kwargs.items():
        setattr(tx, key, value)
    await session.flush()
    await session.refresh(tx)
    return tx


async def delete_transaction(session: AsyncSession, tx: Transaction) -> None:
    await session.delete(tx)
    await session.flush()


# ── Voice logs ────────────────────────────────────────────────────────────────


async def get_voice_log(session: AsyncSession, voice_log_id: uuid.UUID) -> VoiceLog | None:
    return await session.get(VoiceLog, voice_log_id)


async def list_voice_logs(
    session: AsyncSession, user_id: uuid.UUID, *, limit: int = 20
) -> list[VoiceLog]:
    result = await session.execute(
        sa.select(VoiceLog)
        .where(VoiceLog.user_id == user_id)
        .order_by(VoiceLog.created_at.desc())
        .limit(limit)
    )
    return list(result.scalars())


async def create_voice_log(
    session: AsyncSession,
    user_id: uuid.UUID,
    audio_url: str,
    *,
    account_id: uuid.UUID | None = None,
) -> VoiceLog:
    log = VoiceLog(user_id=user_id, audio_url=audio_url, account_id=account_id)
    session.add(log)
    await session.flush()
    return log


async def update_voice_log_status(
    session: AsyncSession,
    voice_log: VoiceLog,
    status: VoiceProcessingStatus,
    *,
    transcript: str | None = None,
    extracted_data: dict[str, Any] | None = None,
    confidence_score: float | None = None,
    error_message: str | None = None,
) -> VoiceLog:
    voice_log.processing_status = status
    if transcript is not None:
        voice_log.transcript = transcript
    if extracted_data is not None:
        voice_log.extracted_data = extracted_data
    if confidence_score is not None:
        voice_log.confidence_score = confidence_score
    if error_message is not None:
        voice_log.error_message = error_message
    await session.flush()
    await session.refresh(voice_log)
    return voice_log


# ── Receipt logs ──────────────────────────────────────────────────────────────


async def get_receipt_log(session: AsyncSession, receipt_log_id: uuid.UUID) -> ReceiptLog | None:
    return await session.get(ReceiptLog, receipt_log_id)


async def create_receipt_log(
    session: AsyncSession,
    user_id: uuid.UUID,
    *,
    account_id: uuid.UUID,
    image_url: str,
) -> ReceiptLog:
    log = ReceiptLog(user_id=user_id, account_id=account_id, image_url=image_url)
    session.add(log)
    await session.flush()
    return log


async def update_receipt_log_status(
    session: AsyncSession,
    receipt_log: ReceiptLog,
    status: VoiceProcessingStatus,
    *,
    ocr_text: str | None = None,
    extracted_data: dict[str, Any] | None = None,
    transaction_id: uuid.UUID | None = None,
    error_message: str | None = None,
) -> ReceiptLog:
    receipt_log.processing_status = status
    if ocr_text is not None:
        receipt_log.ocr_text = ocr_text
    if extracted_data is not None:
        receipt_log.extracted_data = extracted_data
    if transaction_id is not None:
        receipt_log.transaction_id = transaction_id
    if error_message is not None:
        receipt_log.error_message = error_message
    await session.flush()
    await session.refresh(receipt_log)
    return receipt_log
