"""User account service: permanent account deletion."""

from __future__ import annotations

import uuid

import structlog
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import BadGatewayError
from app.domains.users import repository
from app.shared.supabase_admin import SupabaseAdmin, SupabaseAdminError

_logger = structlog.get_logger(__name__)


async def delete_account(
    session: AsyncSession, user_id: uuid.UUID, supabase_admin: SupabaseAdmin
) -> None:
    # DB data is deleted in the request transaction first; if the auth deletion
    # fails, the session dependency rolls everything back.
    await repository.delete_all_user_data(session, user_id)
    try:
        await supabase_admin.delete_user(user_id)
    except SupabaseAdminError as err:
        # Detail (e.g. missing service-role key) stays in the log; the client
        # only sees a generic upstream failure.
        _logger.error("supabase_admin_delete_failed", error=str(err))
        raise BadGatewayError("Account deletion failed, please try again later") from err
    _logger.info("account_deleted", user_id=str(user_id))
