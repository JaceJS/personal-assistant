"""Unit tests for the users service (no DB/Redis needed)."""

from __future__ import annotations

import uuid
from unittest.mock import AsyncMock

import pytest

from app.core.exceptions import BadGatewayError
from app.domains.users import service
from app.shared.supabase_admin import SupabaseAdminError


async def test_delete_account_maps_supabase_admin_error_to_bad_gateway() -> None:
    session = AsyncMock()
    admin = AsyncMock()
    admin.delete_user.side_effect = SupabaseAdminError(
        "SUPABASE_SERVICE_ROLE_KEY is not configured"
    )

    with pytest.raises(BadGatewayError) as exc_info:
        await service.delete_account(session, uuid.uuid4(), admin)

    # Internal config detail must not leak into the client-facing message.
    assert "SERVICE_ROLE" not in exc_info.value.message
    assert exc_info.value.status_code == 502


async def test_delete_account_deletes_data_then_auth_user() -> None:
    session = AsyncMock()
    admin = AsyncMock()
    user_id = uuid.uuid4()

    await service.delete_account(session, user_id, admin)

    admin.delete_user.assert_awaited_once_with(user_id)
