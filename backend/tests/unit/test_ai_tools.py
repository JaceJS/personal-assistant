"""Unit tests for AI tool executors (DB is mocked)."""

from __future__ import annotations

import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.domains.ai.tools import _get_accounts


_USER_ID = uuid.uuid4()


def _make_account(name: str = "BCA") -> MagicMock:
    a = MagicMock()
    a.id = uuid.uuid4()
    a.name = name
    a.type = MagicMock(value="bank")
    a.balance = 1_000_000
    a.currency = "IDR"
    return a


@pytest.mark.asyncio
async def test_get_accounts_includes_id_field() -> None:
    account = _make_account("BCA")
    session = AsyncMock()

    with patch(
        "app.domains.ai.tools.repo.list_accounts",
        AsyncMock(return_value=[account]),
    ):
        result = await _get_accounts(_USER_ID, session)

    accounts = result["accounts"]
    assert len(accounts) == 1
    assert accounts[0]["id"] == str(account.id)
