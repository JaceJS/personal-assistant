"""User account HTTP router."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends

from app.core.auth import CurrentUser
from app.domains.finance.routers.deps import DbSession
from app.domains.users import service
from app.shared.supabase_admin import SupabaseAdmin, get_supabase_admin

router = APIRouter(prefix="/users", tags=["Account"])

SupabaseAdminDep = Annotated[SupabaseAdmin, Depends(get_supabase_admin)]


@router.delete("/me", status_code=204)
async def delete_my_account(
    user_id: CurrentUser,
    session: DbSession,
    supabase_admin: SupabaseAdminDep,
) -> None:
    await service.delete_account(session, user_id, supabase_admin)
