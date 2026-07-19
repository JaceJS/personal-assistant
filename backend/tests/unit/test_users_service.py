"""Unit tests for the users service (no DB needed)."""

from __future__ import annotations

import uuid
from unittest.mock import AsyncMock, patch

import pytest

from app.core.exceptions import BadGatewayError
from app.domains.users import service
from app.shared.supabase_admin import SupabaseAdminError


async def test_delete_account_maps_supabase_admin_error_to_bad_gateway() -> None:
    session = AsyncMock()
    admin = AsyncMock()
    storage = AsyncMock()
    admin.delete_user.side_effect = SupabaseAdminError(
        "SUPABASE_SERVICE_ROLE_KEY is not configured"
    )

    with patch(
        "app.domains.users.service.repository.delete_all_user_data",
        AsyncMock(return_value=[]),
    ), pytest.raises(BadGatewayError) as exc_info:
        await service.delete_account(session, uuid.uuid4(), admin, storage)

    # Internal config detail must not leak into the client-facing message.
    assert "SERVICE_ROLE" not in exc_info.value.message
    assert exc_info.value.status_code == 502


async def test_delete_account_deletes_data_then_auth_user() -> None:
    session = AsyncMock()
    admin = AsyncMock()
    storage = AsyncMock()
    user_id = uuid.uuid4()

    with patch(
        "app.domains.users.service.repository.delete_all_user_data",
        AsyncMock(return_value=[]),
    ) as mock_delete_data:
        await service.delete_account(session, user_id, admin, storage)

    mock_delete_data.assert_awaited_once_with(session, user_id)
    admin.delete_user.assert_awaited_once_with(user_id)


async def test_delete_account_deletes_r2_objects_for_collected_storage_keys() -> None:
    session = AsyncMock()
    admin = AsyncMock()
    storage = AsyncMock()
    user_id = uuid.uuid4()
    keys = [f"{user_id}/audio.webm", f"{user_id}/receipt.jpg"]

    with patch(
        "app.domains.users.service.repository.delete_all_user_data",
        AsyncMock(return_value=keys),
    ):
        await service.delete_account(session, user_id, admin, storage)

    assert storage.delete.await_count == 2
    storage.delete.assert_any_await(keys[0])
    storage.delete.assert_any_await(keys[1])


async def test_delete_account_storage_failure_does_not_block_deletion() -> None:
    session = AsyncMock()
    admin = AsyncMock()
    storage = AsyncMock()
    storage.delete.side_effect = Exception("r2 unreachable")
    user_id = uuid.uuid4()

    with patch(
        "app.domains.users.service.repository.delete_all_user_data",
        AsyncMock(return_value=[f"{user_id}/audio.webm"]),
    ):
        await service.delete_account(session, user_id, admin, storage)  # must not raise

    admin.delete_user.assert_awaited_once_with(user_id)
