"""Receipt scanning endpoints."""

from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, File, Form, UploadFile

from app.core.auth import CurrentUser
from app.core.config import get_settings
from app.core.response import ApiResponse, ok
from app.domains.finance import service
from app.domains.finance.routers.deps import DbSession
from app.domains.finance.schemas import ReceiptStatusRead, ReceiptUploadResponse
from app.shared.queue import create_redis_pool
from app.shared.storage import R2Storage

router = APIRouter(tags=["Receipt"])


@router.post(
    "/receipt/upload",
    response_model=ApiResponse[ReceiptUploadResponse],
    status_code=201,
)
async def upload_receipt(
    user_id: CurrentUser,
    session: DbSession,
    account_id: Annotated[uuid.UUID, Form()],
    file: Annotated[UploadFile, File()],
) -> ApiResponse[ReceiptUploadResponse]:
    settings = get_settings()
    redis = await create_redis_pool(settings)
    try:
        item = await service.create_receipt_upload(
            session,
            user_id,
            account_id=account_id,
            file=file,
            storage=R2Storage(settings),
            redis=redis,
        )
    finally:
        await redis.close()
    return ok(item, message="created")


@router.get("/receipt/{receipt_log_id}", response_model=ApiResponse[ReceiptStatusRead])
async def get_receipt_status(
    receipt_log_id: uuid.UUID, user_id: CurrentUser, session: DbSession
) -> ApiResponse[ReceiptStatusRead]:
    item = await service.get_receipt_status(session, user_id, receipt_log_id)
    return ok(item)
