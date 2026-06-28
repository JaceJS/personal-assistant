"""Finance domain service for ownership checks and account balance management."""

from __future__ import annotations

import uuid
from datetime import date
from pathlib import Path
from typing import Any

from arq.connections import ArqRedis
from fastapi import UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.llm.base import LLMProvider
from app.ai.stt.base import STTProvider
from app.core.exceptions import BadRequestError, ForbiddenError, NotFoundError, TooManyRequestsError
from app.domains.finance import repository as repo
from app.domains.finance.extractor import extract_transaction
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
from app.domains.finance.schemas import (
    AccountCreate,
    AccountUpdate,
    AnonymousVoiceResult,
    BudgetUpsert,
    CategoryCreate,
    CategoryRead,
    CategoryUpdate,
    ReceiptStatusRead,
    ReceiptUploadResponse,
    SavingsGoalContribute,
    SavingsGoalCreate,
    SavingsGoalUpdate,
    TransactionCreate,
    TransactionUpdate,
    VoiceExtractResponse,
    VoiceStatusRead,
    VoiceUploadResponse,
)
from app.shared.queue import RECEIPT_PROCESSING_JOB, VOICE_EXTRACTION_JOB, VOICE_PROCESSING_JOB
from app.shared.storage import R2Storage

# ── Savings Goals ─────────────────────────────────────────────────────────────


async def list_savings_goals(session: AsyncSession, user_id: uuid.UUID) -> list[SavingsGoal]:
    return await repo.list_savings_goals(session, user_id)


async def get_savings_goal(
    session: AsyncSession, goal_id: uuid.UUID, user_id: uuid.UUID
) -> SavingsGoal:
    goal = await repo.get_savings_goal(session, goal_id)
    if goal is None:
        raise NotFoundError(f"Savings goal {goal_id} not found")
    if goal.user_id != user_id:
        raise ForbiddenError("You don't own this savings goal")
    return goal


async def create_savings_goal(
    session: AsyncSession, user_id: uuid.UUID, data: SavingsGoalCreate
) -> SavingsGoal:
    if data.target_amount <= 0:
        raise BadRequestError("target_amount must be greater than 0")
    return await repo.create_savings_goal(
        session,
        user_id,
        name=data.name,
        icon=data.icon,
        target_amount=data.target_amount,
        target_date=data.target_date,
        current_amount=0,
    )


async def update_savings_goal(
    session: AsyncSession, goal_id: uuid.UUID, user_id: uuid.UUID, data: SavingsGoalUpdate
) -> SavingsGoal:
    goal = await get_savings_goal(session, goal_id, user_id)
    updates: dict[str, Any] = {
        k: v for k, v in data.model_dump(exclude_unset=True).items() if v is not None
    }
    if "target_amount" in updates and updates["target_amount"] <= 0:
        raise BadRequestError("target_amount must be greater than 0")
    return await repo.update_savings_goal(session, goal, **updates)


async def contribute_to_savings_goal(
    session: AsyncSession,
    goal_id: uuid.UUID,
    user_id: uuid.UUID,
    data: SavingsGoalContribute,
) -> SavingsGoal:
    goal = await get_savings_goal(session, goal_id, user_id)
    new_amount = goal.current_amount + data.amount
    new_amount = max(0, min(new_amount, goal.target_amount))
    return await repo.update_savings_goal(session, goal, current_amount=new_amount)


async def delete_savings_goal(
    session: AsyncSession, goal_id: uuid.UUID, user_id: uuid.UUID
) -> None:
    goal = await get_savings_goal(session, goal_id, user_id)
    await repo.update_savings_goal(session, goal, is_archived=True)


# ── Budget ────────────────────────────────────────────────────────────────────


async def get_budget(session: AsyncSession, user_id: uuid.UUID) -> Budget | None:
    return await repo.get_budget(session, user_id)


async def upsert_budget(session: AsyncSession, user_id: uuid.UUID, data: BudgetUpsert) -> Budget:
    return await repo.upsert_budget(session, user_id, data.monthly_limit)


# ── Accounts ──────────────────────────────────────────────────────────────────


async def get_account_or_404(
    session: AsyncSession, account_id: uuid.UUID, user_id: uuid.UUID
) -> Account:
    account = await repo.get_account(session, account_id)
    if account is None:
        raise NotFoundError(f"Account {account_id} not found")
    if account.user_id != user_id:
        raise ForbiddenError("You don't own this account")
    return account


async def list_accounts(session: AsyncSession, user_id: uuid.UUID) -> list[Account]:
    return await repo.list_accounts(session, user_id)


async def create_account(session: AsyncSession, user_id: uuid.UUID, data: AccountCreate) -> Account:
    return await repo.create_account(
        session,
        user_id,
        name=data.name,
        type=data.type,
        currency=data.currency,
        initial_balance=data.initial_balance,
        balance=data.initial_balance,
    )


async def update_account(
    session: AsyncSession, user_id: uuid.UUID, account_id: uuid.UUID, data: AccountUpdate
) -> Account:
    account = await get_account_or_404(session, account_id, user_id)
    return await repo.update_account(session, account, **data.model_dump(exclude_unset=True))


# ── Categories ────────────────────────────────────────────────────────────────


async def get_category_or_404(
    session: AsyncSession, category_id: uuid.UUID, user_id: uuid.UUID
) -> Category:
    """Return a category the user may access, else raise.

    System-default categories (user_id IS NULL) are shared and readable by everyone;
    user-owned categories are only accessible to their owner.
    """
    category = await repo.get_category(session, category_id)
    if category is None:
        raise NotFoundError(f"Category {category_id} not found")
    if category.user_id is not None and category.user_id != user_id:
        raise ForbiddenError("You don't own this category")
    return category


def _build_category_read(category: Category, ucb: UserCategoryBudget | None) -> CategoryRead:
    return CategoryRead(
        id=category.id,
        user_id=category.user_id,
        name=category.name,
        type=category.type,
        icon=category.icon,
        color=category.color,
        is_archived=category.is_archived,
        created_at=category.created_at,
        updated_at=category.updated_at,
        budget_limit=ucb.budget_limit if ucb else None,
        is_fixed=ucb.is_fixed if ucb else False,
    )


async def get_category_read(
    session: AsyncSession, category_id: uuid.UUID, user_id: uuid.UUID
) -> CategoryRead:
    category = await get_category_or_404(session, category_id, user_id)
    ucb = await repo.get_user_category_budget(session, user_id, category_id)
    return _build_category_read(category, ucb)


async def seed_default_categories(session: AsyncSession, user_id: uuid.UUID) -> list[Category]:
    system_cats = await repo.list_system_categories(session)
    seeded = []
    for sc in system_cats:
        cat = await repo.create_category(
            session,
            user_id,
            name=sc.name,
            type=sc.type,
            icon=sc.icon,
            color=sc.color,
        )
        seeded.append(cat)
    await session.flush()
    return seeded


async def list_categories(session: AsyncSession, user_id: uuid.UUID) -> list[CategoryRead]:
    if not await repo.has_user_categories(session, user_id):
        await seed_default_categories(session, user_id)
    categories = await repo.list_categories(session, user_id)
    budget_map = await repo.get_user_category_budgets_map(session, user_id)
    return [_build_category_read(cat, budget_map.get(cat.id)) for cat in categories]


async def create_category(
    session: AsyncSession, user_id: uuid.UUID, data: CategoryCreate
) -> CategoryRead:
    category = await repo.create_category(
        session,
        user_id,
        name=data.name,
        type=data.type,
        icon=data.icon,
        color=data.color,
    )
    return _build_category_read(category, None)


async def update_category(
    session: AsyncSession, category_id: uuid.UUID, user_id: uuid.UUID, data: CategoryUpdate
) -> CategoryRead:
    category = await get_category_or_404(session, category_id, user_id)

    meta_data = data.model_dump(exclude={"budget_limit", "is_fixed"}, exclude_unset=True)
    budget_data = data.model_dump(include={"budget_limit", "is_fixed"}, exclude_unset=True)

    if category.user_id != user_id:
        raise ForbiddenError("You don't own this category")
    if meta_data:
        category = await repo.update_category(session, category, **meta_data)

    ucb: UserCategoryBudget | None = None
    if budget_data:
        existing = await repo.get_user_category_budget(session, user_id, category_id)
        ucb = await repo.upsert_user_category_budget(
            session,
            user_id,
            category_id,
            budget_limit=budget_data.get(
                "budget_limit", existing.budget_limit if existing else None
            ),
            is_fixed=budget_data.get("is_fixed", existing.is_fixed if existing else False),
        )
    else:
        ucb = await repo.get_user_category_budget(session, user_id, category_id)

    return _build_category_read(category, ucb)


async def archive_category(
    session: AsyncSession, category_id: uuid.UUID, user_id: uuid.UUID
) -> None:
    category = await get_category_or_404(session, category_id, user_id)
    if category.user_id != user_id:
        raise ForbiddenError("You don't own this category")
    await repo.archive_category(session, category)


# ── Transactions ──────────────────────────────────────────────────────────────


async def get_transaction_or_404(
    session: AsyncSession, tx_id: uuid.UUID, user_id: uuid.UUID
) -> Transaction:
    tx = await repo.get_transaction(session, tx_id)
    if tx is None:
        raise NotFoundError(f"Transaction {tx_id} not found")
    if tx.user_id != user_id:
        raise ForbiddenError("You don't own this transaction")
    return tx


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
) -> tuple[list[Transaction], int]:
    items = await repo.list_transactions(
        session,
        user_id,
        account_id=account_id,
        date_from=date_from,
        date_to=date_to,
        search=search,
        status=status,
        limit=limit,
        offset=offset,
    )
    total = await repo.count_transactions(
        session,
        user_id,
        account_id=account_id,
        date_from=date_from,
        date_to=date_to,
        search=search,
        status=status,
    )
    return items, total


async def create_transaction(
    session: AsyncSession, user_id: uuid.UUID, data: TransactionCreate
) -> Transaction:
    account = await get_account_or_404(session, data.account_id, user_id)

    if data.category_id is not None:
        await get_category_or_404(session, data.category_id, user_id)

    tx = await repo.create_transaction(
        session,
        user_id,
        account_id=data.account_id,
        category_id=data.category_id,
        amount=data.amount,
        currency=data.currency,
        merchant=data.merchant,
        note=data.note,
        occurred_at=data.occurred_at,
        source=data.source,
        status=data.status,
        voice_log_id=data.voice_log_id,
    )
    if data.status == TransactionStatus.confirmed:
        await repo.update_account(session, account, balance=account.balance + data.amount)
    return tx


async def update_transaction(
    session: AsyncSession, user_id: uuid.UUID, tx_id: uuid.UUID, data: TransactionUpdate
) -> Transaction:
    tx = await get_transaction_or_404(session, tx_id, user_id)

    updates = data.model_dump(exclude_unset=True)
    if updates.get("category_id") is not None:
        await get_category_or_404(session, updates["category_id"], user_id)

    new_account_id = updates.get("account_id")
    account_changing = new_account_id is not None and new_account_id != tx.account_id

    if account_changing:
        assert new_account_id is not None
        await get_account_or_404(session, new_account_id, user_id)
        updated = await repo.update_transaction(session, tx, **updates)
        # Reverse balance on old account if the transaction was already confirmed.
        if tx.status == TransactionStatus.confirmed:
            old_acct = await get_account_or_404(session, tx.account_id, user_id)
            await repo.update_account(session, old_acct, balance=old_acct.balance - tx.amount)
        # Apply balance to new account if it is now (or remains) confirmed.
        if updated.status == TransactionStatus.confirmed:
            new_acct = await get_account_or_404(session, updated.account_id, user_id)
            await repo.update_account(session, new_acct, balance=new_acct.balance + updated.amount)
    else:
        old_balance_effect = tx.amount if tx.status == TransactionStatus.confirmed else 0
        updated = await repo.update_transaction(session, tx, **updates)
        new_balance_effect = updated.amount if updated.status == TransactionStatus.confirmed else 0
        if old_balance_effect != new_balance_effect:
            account = await get_account_or_404(session, updated.account_id, user_id)
            delta = new_balance_effect - old_balance_effect
            await repo.update_account(session, account, balance=account.balance + delta)

    return updated


async def delete_transaction(session: AsyncSession, user_id: uuid.UUID, tx_id: uuid.UUID) -> None:
    tx = await get_transaction_or_404(session, tx_id, user_id)

    if tx.status == TransactionStatus.confirmed:
        account = await get_account_or_404(session, tx.account_id, user_id)
        await repo.update_account(session, account, balance=account.balance - tx.amount)

    await repo.delete_transaction(session, tx)


# Voice logs


async def create_voice_upload(
    session: AsyncSession,
    user_id: uuid.UUID,
    *,
    account_id: uuid.UUID,
    file: UploadFile,
    storage: R2Storage,
    redis: ArqRedis,
) -> VoiceUploadResponse:
    await get_account_or_404(session, account_id, user_id)

    content_type = file.content_type or ""
    if not content_type.startswith("audio/"):
        raise BadRequestError("Voice upload must be an audio file")

    audio = await file.read()
    if not audio:
        raise BadRequestError("Voice upload cannot be empty")

    suffix = Path(file.filename or "").suffix.lower()
    object_ext = suffix if suffix else ".webm"
    object_key = f"voice/{user_id}/{uuid.uuid4()}{object_ext}"

    await storage.upload(object_key, audio, content_type)
    voice_log = await repo.create_voice_log(
        session, user_id, audio_url=object_key, account_id=account_id
    )
    await session.flush()

    await redis.enqueue_job(
        VOICE_PROCESSING_JOB,
        voice_log_id=str(voice_log.id),
        account_id=str(account_id),
    )

    return VoiceUploadResponse(
        voice_log_id=voice_log.id,
        status=VoiceProcessingStatus.pending,
    )


async def get_voice_log_or_404(
    session: AsyncSession, voice_log_id: uuid.UUID, user_id: uuid.UUID
) -> VoiceLog:
    voice_log = await repo.get_voice_log(session, voice_log_id)
    if voice_log is None:
        raise NotFoundError(f"Voice log {voice_log_id} not found")
    if voice_log.user_id != user_id:
        raise ForbiddenError("You don't own this voice log")
    return voice_log


async def get_voice_status(
    session: AsyncSession, user_id: uuid.UUID, voice_log_id: uuid.UUID
) -> VoiceStatusRead:
    voice_log = await get_voice_log_or_404(session, voice_log_id, user_id)
    tx = await repo.get_transaction_by_voice_log(session, voice_log.id)

    return VoiceStatusRead(
        id=voice_log.id,
        status=voice_log.processing_status,
        transcript=voice_log.transcript,
        extracted_data=voice_log.extracted_data,
        transaction_id=tx.id if tx is not None else None,
        error_message=voice_log.error_message,
    )


async def extract_voice_transcript(
    session: AsyncSession,
    user_id: uuid.UUID,
    voice_log_id: uuid.UUID,
    *,
    transcript: str,
    redis: ArqRedis,
) -> VoiceExtractResponse:
    voice_log = await get_voice_log_or_404(session, voice_log_id, user_id)
    if voice_log.processing_status != VoiceProcessingStatus.transcribed:
        raise BadRequestError("Voice log is not in transcribed state")
    if voice_log.account_id is None:
        raise BadRequestError("Voice log has no associated account")

    await redis.enqueue_job(
        VOICE_EXTRACTION_JOB,
        voice_log_id=str(voice_log_id),
        account_id=str(voice_log.account_id),
        transcript=transcript,
    )

    return VoiceExtractResponse(
        voice_log_id=voice_log_id,
        status=VoiceProcessingStatus.extracting,
    )


# Receipt logs


async def create_receipt_upload(
    session: AsyncSession,
    user_id: uuid.UUID,
    *,
    account_id: uuid.UUID,
    file: UploadFile,
    storage: R2Storage,
    redis: ArqRedis,
) -> ReceiptUploadResponse:
    await get_account_or_404(session, account_id, user_id)

    content_type = file.content_type or ""
    if not content_type.startswith("image/"):
        raise BadRequestError("Receipt upload must be an image file")

    image = await file.read()
    if not image:
        raise BadRequestError("Receipt upload cannot be empty")

    suffix = Path(file.filename or "").suffix.lower()
    object_ext = suffix if suffix else ".jpg"
    object_key = f"receipt/{user_id}/{uuid.uuid4()}{object_ext}"

    await storage.upload(object_key, image, content_type)
    receipt_log = await repo.create_receipt_log(
        session, user_id, account_id=account_id, image_url=object_key
    )
    await session.flush()

    await redis.enqueue_job(
        RECEIPT_PROCESSING_JOB,
        receipt_log_id=str(receipt_log.id),
        account_id=str(account_id),
    )

    return ReceiptUploadResponse(
        receipt_log_id=receipt_log.id,
        status=VoiceProcessingStatus.pending,
    )


async def get_receipt_log_or_404(
    session: AsyncSession, receipt_log_id: uuid.UUID, user_id: uuid.UUID
) -> ReceiptLog:
    receipt_log = await repo.get_receipt_log(session, receipt_log_id)
    if receipt_log is None:
        raise NotFoundError(f"Receipt log {receipt_log_id} not found")
    if receipt_log.user_id != user_id:
        raise ForbiddenError("You don't own this receipt log")
    return receipt_log


async def get_receipt_status(
    session: AsyncSession, user_id: uuid.UUID, receipt_log_id: uuid.UUID
) -> ReceiptStatusRead:
    receipt_log = await get_receipt_log_or_404(session, receipt_log_id, user_id)

    return ReceiptStatusRead(
        id=receipt_log.id,
        status=receipt_log.processing_status,
        extracted_data=receipt_log.extracted_data,
        transaction_id=receipt_log.transaction_id,
        error_message=receipt_log.error_message,
    )


# ── Anonymous voice processing ────────────────────────────────────────────────

ANON_VOICE_RATE_LIMIT = 10
_ANON_VOICE_RATE_WINDOW_SECONDS = 3600


async def _enforce_anonymous_rate_limit(redis: ArqRedis, client_ip: str) -> None:
    key = f"anon_voice:{client_ip}"
    count = await redis.incr(key)
    if count == 1:
        await redis.expire(key, _ANON_VOICE_RATE_WINDOW_SECONDS)
    if count > ANON_VOICE_RATE_LIMIT:
        raise TooManyRequestsError(
            f"Rate limit exceeded: {ANON_VOICE_RATE_LIMIT} anonymous voice requests per hour"
        )


async def process_anonymous_voice(
    file: UploadFile,
    stt: STTProvider,
    llm: LLMProvider,
    redis: ArqRedis,
    client_ip: str,
) -> AnonymousVoiceResult:
    content_type = file.content_type or ""
    if not content_type.startswith("audio/"):
        raise BadRequestError("Voice upload must be an audio file")

    await _enforce_anonymous_rate_limit(redis, client_ip)

    audio = await file.read()
    if not audio:
        raise BadRequestError("Voice upload cannot be empty")

    transcript = await stt.transcribe(audio, filename=file.filename or "audio.m4a")
    extracted = await extract_transaction(transcript, llm)

    return AnonymousVoiceResult(
        amount=extracted.amount,
        currency=extracted.currency,
        merchant=extracted.merchant,
        category_name=extracted.category_name,
        note=extracted.note,
        confidence=extracted.confidence,
    )
