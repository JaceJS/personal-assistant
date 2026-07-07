"""User account service: profile updates and permanent account deletion."""

from __future__ import annotations

import time
import uuid

import structlog
from fastapi import UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings
from app.core.exceptions import BadGatewayError
from app.core.upload_utils import (
    IMAGE_EXT_MAP,
    IMAGE_MIME_ALLOWLIST,
    MAX_IMAGE_BYTES,
    read_and_validate_upload,
)
from app.domains.users import repository
from app.domains.users.schemas import AvatarUploadResponse
from app.shared.storage import R2Storage
from app.shared.supabase_admin import SupabaseAdmin, SupabaseAdminError

_logger = structlog.get_logger(__name__)


async def upload_avatar(
    user_id: uuid.UUID,
    file: UploadFile,
    storage: R2Storage,
    settings: Settings,
) -> AvatarUploadResponse:
    """Validate and upload a profile photo, replacing any previous one.

    Uses a fixed object key per user (not a UUID) so re-uploads overwrite the
    same object instead of leaving old avatars orphaned in R2. The `?v=` query
    param busts any client/CDN cache of the previous image at that key.
    """
    data, mime, ext = await read_and_validate_upload(
        file,
        max_bytes=MAX_IMAGE_BYTES,
        mime_allowlist=IMAGE_MIME_ALLOWLIST,
        ext_map=IMAGE_EXT_MAP,
        default_ext=".jpg",
    )
    key = f"avatar/{user_id}{ext}"
    await storage.upload(key, data, mime)
    url = f"{settings.r2_public_url_base.rstrip('/')}/{key}?v={int(time.time())}"
    return AvatarUploadResponse(url=url)


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
