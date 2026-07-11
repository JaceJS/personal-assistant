"""User account HTTP router."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, File, UploadFile

from app.core.auth import CurrentUser
from app.core.config import get_settings
from app.core.rate_limit import per_user_rate_limit
from app.core.response import ApiResponse, ok
from app.domains.finance.routers.deps import DbSession
from app.domains.users import service
from app.domains.users.schemas import AvatarUploadResponse
from app.shared.storage import R2Storage
from app.shared.supabase_admin import SupabaseAdmin, get_supabase_admin

router = APIRouter(prefix="/users", tags=["Account"])

SupabaseAdminDep = Annotated[SupabaseAdmin, Depends(get_supabase_admin)]

_AVATAR_LIMIT = per_user_rate_limit("avatar_upload", 20, 3600)


@router.delete("/me", status_code=204)
async def delete_my_account(
    user_id: CurrentUser,
    session: DbSession,
    supabase_admin: SupabaseAdminDep,
) -> None:
    storage = R2Storage(get_settings())
    await service.delete_account(session, user_id, supabase_admin, storage)


@router.patch(
    "/me/avatar",
    response_model=ApiResponse[AvatarUploadResponse],
    dependencies=[_AVATAR_LIMIT],
)
async def upload_my_avatar(
    user_id: CurrentUser,
    file: Annotated[UploadFile, File()],
) -> ApiResponse[AvatarUploadResponse]:
    settings = get_settings()
    storage = R2Storage(settings)
    item = await service.upload_avatar(user_id, file, storage, settings)
    return ok(item)
