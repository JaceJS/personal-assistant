"""User account service: permanent account deletion."""

from __future__ import annotations

import uuid

import structlog
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import BadGatewayError
from app.domains.users import repository
from app.shared.storage import R2Storage
from app.shared.supabase_admin import SupabaseAdmin, SupabaseAdminError

_logger = structlog.get_logger(__name__)


async def delete_account(
    session: AsyncSession,
    user_id: uuid.UUID,
    supabase_admin: SupabaseAdmin,
    storage: R2Storage,
) -> None:
    # DB data is deleted in the request transaction first; if the auth deletion
    # fails, the session dependency rolls everything back.
    storage_keys = await repository.delete_all_user_data(session, user_id)
    try:
        await supabase_admin.delete_user(user_id)
    except SupabaseAdminError as err:
        # Detail (e.g. missing service-role key) stays in the log; the client
        # only sees a generic upstream failure.
        _logger.error("supabase_admin_delete_failed", error=str(err))
        raise BadGatewayError("Account deletion failed, please try again later") from err

    # Best-effort: DB commit and auth deletion already succeeded, so a failed
    # R2 cleanup must not fail the request (would leave DB/auth deleted but
    # report an error to the user).
    for key in storage_keys:
        try:
            await storage.delete(key)
        except Exception as cleanup_exc:
            _logger.warning(
                "account_delete_storage_cleanup_failed",
                user_id=str(user_id),
                key=key,
                error=str(cleanup_exc),
            )

    _logger.info("account_deleted", user_id=str(user_id))
