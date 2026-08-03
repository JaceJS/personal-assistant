"""Finance domain service for ownership checks and account balance management."""

from __future__ import annotations

import uuid
from datetime import UTC, date, datetime, timedelta
from typing import Any

from fastapi import BackgroundTasks, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.llm.openrouter import OpenRouterLLM
from app.ai.stt.factory import get_stt_provider
from app.core.config import get_settings
from app.core.exceptions import BadRequestError, ConflictError, ForbiddenError, NotFoundError
from app.core.upload_utils import (
    AUDIO_EXT_MAP,
    AUDIO_MIME_ALLOWLIST,
    IMAGE_EXT_MAP,
    IMAGE_MIME_ALLOWLIST,
    MAX_AUDIO_BYTES,
    MAX_IMAGE_BYTES,
    read_and_validate_upload,
)
from app.domains.ai import repository as ai_repo
from app.domains.finance import jobs
from app.domains.finance import repository as repo
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
from app.shared.storage import R2Storage

# A voice/receipt job stuck in a non-terminal status past this long (e.g. its
# BackgroundTask was lost to a process restart) is treated as failed the next
# time its status is polled.
_STUCK_JOB_TIMEOUT = timedelta(seconds=75)
_TERMINAL_STATUSES = {VoiceProcessingStatus.completed, VoiceProcessingStatus.failed}

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


async def _get_account_for_balance_update(
    session: AsyncSession, account_id: uuid.UUID, user_id: uuid.UUID
) -> Account:
    account = await repo.get_account_for_update(session, account_id)
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
    update_data = data.model_dump(exclude_unset=True)
    if "initial_balance" in update_data:
        # Correcting the starting balance must preserve every transaction
        # already applied on top of it: shift `balance` by the same delta.
        delta = update_data["initial_balance"] - account.initial_balance
        update_data["balance"] = account.balance + delta
    return await repo.update_account(session, account, **update_data)


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
    account = await _get_account_for_balance_update(session, data.account_id, user_id)

    if data.category_id is not None:
        await get_category_or_404(session, data.category_id, user_id)

    if data.chat_session_id is not None and data.status == TransactionStatus.draft:
        pending = await repo.get_pending_draft_transactions(session, data.chat_session_id)
        merchant_key = (data.merchant or "").strip().lower()
        if any(
            (tx.merchant or "").strip().lower() == merchant_key and tx.amount == data.amount
            for tx in pending
        ):
            raise ConflictError("A pending draft for this merchant and amount already exists")

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
        chat_session_id=data.chat_session_id,
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
            old_acct = await _get_account_for_balance_update(session, tx.account_id, user_id)
            await repo.update_account(session, old_acct, balance=old_acct.balance - tx.amount)
        # Apply balance to new account if it is now (or remains) confirmed.
        if updated.status == TransactionStatus.confirmed:
            new_acct = await _get_account_for_balance_update(session, updated.account_id, user_id)
            await repo.update_account(session, new_acct, balance=new_acct.balance + updated.amount)
    else:
        old_balance_effect = tx.amount if tx.status == TransactionStatus.confirmed else 0
        updated = await repo.update_transaction(session, tx, **updates)
        new_balance_effect = updated.amount if updated.status == TransactionStatus.confirmed else 0
        if old_balance_effect != new_balance_effect:
            account = await _get_account_for_balance_update(session, updated.account_id, user_id)
            delta = new_balance_effect - old_balance_effect
            await repo.update_account(session, account, balance=account.balance + delta)

    return updated


async def delete_transaction(session: AsyncSession, user_id: uuid.UUID, tx_id: uuid.UUID) -> None:
    tx = await get_transaction_or_404(session, tx_id, user_id)

    if tx.status == TransactionStatus.confirmed:
        account = await _get_account_for_balance_update(session, tx.account_id, user_id)
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
    background_tasks: BackgroundTasks,
    chat_session_id: uuid.UUID | None = None,
) -> VoiceUploadResponse:
    await get_account_or_404(session, account_id, user_id)
    chat_session = await ai_repo.get_or_create_session(session, user_id, chat_session_id)

    audio, detected_mime, object_ext = await read_and_validate_upload(
        file,
        max_bytes=MAX_AUDIO_BYTES,
        mime_allowlist=AUDIO_MIME_ALLOWLIST,
        ext_map=AUDIO_EXT_MAP,
        default_ext=".webm",
    )
    object_key = f"voice/{user_id}/{uuid.uuid4()}{object_ext}"

    await storage.upload(object_key, audio, detected_mime)
    voice_log = await repo.create_voice_log(
        session, user_id, audio_url=object_key, account_id=account_id
    )
    await session.commit()

    settings = get_settings()
    background_tasks.add_task(
        jobs.process_voice,
        stt=get_stt_provider(settings),
        r2=storage,
        voice_log_id=str(voice_log.id),
        account_id=str(account_id),
    )

    return VoiceUploadResponse(
        voice_log_id=voice_log.id,
        status=VoiceProcessingStatus.pending,
        chat_session_id=chat_session.id,
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
    if (
        voice_log.processing_status not in _TERMINAL_STATUSES
        and datetime.now(UTC) - voice_log.updated_at > _STUCK_JOB_TIMEOUT
    ):
        # Guard against a job that finishes between our read and this write:
        # only self-heal if the status is still exactly what we just read,
        # then re-read so a winning job's real result isn't shadowed.
        await repo.update_voice_log_status_if(
            session,
            voice_log.id,
            expected_statuses=[voice_log.processing_status],
            status=VoiceProcessingStatus.failed,
            error_message="Processing timed out",
        )
        voice_log = await repo.get_voice_log(session, voice_log.id) or voice_log
    txs = await repo.get_transactions_by_voice_log(session, voice_log.id)

    return VoiceStatusRead(
        id=voice_log.id,
        status=voice_log.processing_status,
        transcript=voice_log.transcript,
        extracted_data=voice_log.extracted_data or [],
        transaction_ids=[tx.id for tx in txs],
        error_message=voice_log.error_message,
    )


async def extract_voice_transcript(
    session: AsyncSession,
    user_id: uuid.UUID,
    voice_log_id: uuid.UUID,
    *,
    transcript: str,
    background_tasks: BackgroundTasks,
    chat_session_id: uuid.UUID | None = None,
) -> VoiceExtractResponse:
    voice_log = await get_voice_log_or_404(session, voice_log_id, user_id)
    if voice_log.account_id is None:
        raise BadRequestError("Voice log has no associated account")
    chat_session = await ai_repo.get_or_create_session(session, user_id, chat_session_id)

    # Atomic UPDATE ... WHERE status = 'transcribed' (not read-then-write) so
    # two requests racing the same voice log can't both pass the check before
    # either commits and both schedule a paid LLM extraction job.
    claimed = await repo.update_voice_log_status_if(
        session,
        voice_log_id,
        expected_statuses=[VoiceProcessingStatus.transcribed],
        status=VoiceProcessingStatus.extracting,
    )
    if not claimed:
        raise BadRequestError("Voice log is not in transcribed state")
    await session.commit()

    background_tasks.add_task(
        jobs.extract_voice,
        llm=OpenRouterLLM(get_settings()),
        voice_log_id=str(voice_log_id),
        account_id=str(voice_log.account_id),
        transcript=transcript,
        chat_session_id=str(chat_session.id),
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
    background_tasks: BackgroundTasks,
    chat_session_id: uuid.UUID | None = None,
) -> ReceiptUploadResponse:
    await get_account_or_404(session, account_id, user_id)
    chat_session = await ai_repo.get_or_create_session(session, user_id, chat_session_id)

    image, detected_mime, object_ext = await read_and_validate_upload(
        file,
        max_bytes=MAX_IMAGE_BYTES,
        mime_allowlist=IMAGE_MIME_ALLOWLIST,
        ext_map=IMAGE_EXT_MAP,
        default_ext=".jpg",
    )
    object_key = f"receipt/{user_id}/{uuid.uuid4()}{object_ext}"

    await storage.upload(object_key, image, detected_mime)
    receipt_log = await repo.create_receipt_log(
        session, user_id, account_id=account_id, image_url=object_key
    )
    await session.commit()

    settings = get_settings()
    background_tasks.add_task(
        jobs.process_receipt,
        vision_llm=OpenRouterLLM(settings, model=settings.receipt_model),
        r2=storage,
        receipt_log_id=str(receipt_log.id),
        account_id=str(account_id),
        chat_session_id=str(chat_session.id),
    )

    return ReceiptUploadResponse(
        receipt_log_id=receipt_log.id,
        status=VoiceProcessingStatus.pending,
        chat_session_id=chat_session.id,
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
    if (
        receipt_log.processing_status not in _TERMINAL_STATUSES
        and datetime.now(UTC) - receipt_log.updated_at > _STUCK_JOB_TIMEOUT
    ):
        # Guard against a job that finishes between our read and this write:
        # only self-heal if the status is still exactly what we just read,
        # then re-read so a winning job's real result isn't shadowed.
        await repo.update_receipt_log_status_if(
            session,
            receipt_log.id,
            expected_statuses=[receipt_log.processing_status],
            status=VoiceProcessingStatus.failed,
            error_message="Processing timed out",
        )
        receipt_log = await repo.get_receipt_log(session, receipt_log.id) or receipt_log
    txs = await repo.get_transactions_by_receipt_log(session, receipt_log.id)

    return ReceiptStatusRead(
        id=receipt_log.id,
        status=receipt_log.processing_status,
        extracted_data=receipt_log.extracted_data or [],
        transaction_ids=[tx.id for tx in txs],
        error_message=receipt_log.error_message,
    )
