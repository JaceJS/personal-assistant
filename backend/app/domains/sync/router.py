"""Sync domain HTTP router."""

from __future__ import annotations

from fastapi import APIRouter

from app.core.auth import CurrentUser
from app.core.response import ApiResponse, ok
from app.domains.finance.routers.deps import DbSession
from app.domains.sync import service
from app.domains.sync.schemas import BulkImportPayload, BulkImportResult

router = APIRouter(prefix="/sync", tags=["Sync"])


@router.post("/import", response_model=ApiResponse[BulkImportResult])
async def import_local_data(
    payload: BulkImportPayload,
    user_id: CurrentUser,
    session: DbSession,
) -> ApiResponse[BulkImportResult]:
    result = await service.bulk_import(session, user_id, payload)
    return ok(result)
