"""Unit tests for AI tool executors (DB is mocked)."""

from __future__ import annotations

import json
import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.domains.ai.tools import _get_accounts, _parse_limit, execute_tool

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


@pytest.mark.parametrize(
    ("raw", "expected"),
    [
        (None, 10),
        ("banana", 10),
        (7, 7),
        ("15", 15),
        (-5, 1),
        (0, 1),
        (999, 20),
    ],
)
def test_parse_limit(raw: object, expected: int) -> None:
    assert _parse_limit(raw) == expected


async def test_execute_tool_does_not_crash_on_non_numeric_limit() -> None:
    session = AsyncMock()
    mock_result = MagicMock()
    mock_result.all.return_value = []
    session.execute = AsyncMock(return_value=mock_result)

    raw_result = await execute_tool(
        "get_recent_transactions", {"limit": "not-a-number"}, _USER_ID, session
    )

    assert json.loads(raw_result) == {"transactions": [], "count": 0}
