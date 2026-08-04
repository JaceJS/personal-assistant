"""Unit tests for guest (anonymous) AI tool executors — no Postgres writes,
only a read-only system-category lookup touches the DB."""

from __future__ import annotations

import json
import uuid
from unittest.mock import AsyncMock, MagicMock, patch

from app.domains.ai.guest_tools import (
    GUEST_TOOLS,
    _guest_create_transaction,
    _guest_get_accounts,
    execute_guest_tool,
)
from app.domains.ai.schemas import GuestAccountSnapshot

_ACC_ID = uuid.uuid4()


def _account(
    id_: uuid.UUID = _ACC_ID, name: str = "Dompet", balance: int = 500_000
) -> GuestAccountSnapshot:
    return GuestAccountSnapshot(id=id_, name=name, balance=balance, currency="IDR")


def _category(name: str) -> MagicMock:
    cat = MagicMock()
    cat.name = name
    return cat


async def test_guest_get_accounts_includes_id_and_totals() -> None:
    result = await _guest_get_accounts([_account(_ACC_ID, "Dompet", 500_000)])

    assert result["accounts"][0]["id"] == str(_ACC_ID)
    assert result["accounts"][0]["name"] == "Dompet"
    assert result["total_balance"] == 500_000


async def test_guest_get_accounts_sums_multiple_accounts() -> None:
    result = await _guest_get_accounts(
        [_account(uuid.uuid4(), balance=100_000), _account(uuid.uuid4(), balance=250_000)]
    )

    assert result["total_balance"] == 350_000


async def test_guest_get_accounts_empty_list() -> None:
    result = await _guest_get_accounts([])

    assert result["accounts"] == []
    assert result["total_balance"] == 0


async def test_guest_create_transaction_rejects_unknown_account_id() -> None:
    session = AsyncMock()
    result = await _guest_create_transaction(
        session,
        {"account_id": str(uuid.uuid4()), "amount": -20000},
        [_account(_ACC_ID)],
    )

    assert "error" in result


async def test_guest_create_transaction_rejects_invalid_account_id_format() -> None:
    session = AsyncMock()
    result = await _guest_create_transaction(
        session, {"account_id": "not-a-uuid", "amount": -20000}, [_account(_ACC_ID)]
    )

    assert "error" in result


async def test_guest_create_transaction_rejects_non_integer_amount() -> None:
    session = AsyncMock()
    result = await _guest_create_transaction(
        session, {"account_id": str(_ACC_ID), "amount": "20000"}, [_account(_ACC_ID)]
    )

    assert "error" in result


async def test_guest_create_transaction_never_persists_to_db() -> None:
    session = AsyncMock()
    with patch(
        "app.domains.ai.guest_tools.finance_repo.list_system_categories",
        AsyncMock(return_value=[]),
    ):
        await _guest_create_transaction(
            session,
            {"account_id": str(_ACC_ID), "amount": -20000, "merchant": "Sate"},
            [_account(_ACC_ID)],
        )

    session.add.assert_not_called()
    session.commit.assert_not_called()
    session.flush.assert_not_called()


async def test_guest_create_transaction_returns_draft_shape_with_created_at() -> None:
    session = AsyncMock()
    with patch(
        "app.domains.ai.guest_tools.finance_repo.list_system_categories",
        AsyncMock(return_value=[_category("Makan & Jajan")]),
    ):
        result = await _guest_create_transaction(
            session,
            {
                "account_id": str(_ACC_ID),
                "amount": -20000,
                "merchant": "Sate",
                "category_name": "makan",
            },
            [_account(_ACC_ID)],
        )

    assert result["amount"] == -20000
    assert result["merchant"] == "Sate"
    assert result["category_name"] == "Makan & Jajan"
    assert result["status"] == "draft"
    assert result["account_id"] == str(_ACC_ID)
    assert "transaction_id" in result
    assert "created_at" in result


async def test_guest_create_transaction_warns_when_category_unresolved() -> None:
    session = AsyncMock()
    with patch(
        "app.domains.ai.guest_tools.finance_repo.list_system_categories",
        AsyncMock(return_value=[]),
    ):
        result = await _guest_create_transaction(
            session,
            {"account_id": str(_ACC_ID), "amount": -20000, "category_name": "zzz-no-match"},
            [_account(_ACC_ID)],
        )

    assert result["category_name"] is None
    assert "category_warning" in result


async def test_guest_create_transaction_warns_when_no_category_given() -> None:
    session = AsyncMock()
    with patch(
        "app.domains.ai.guest_tools.finance_repo.list_system_categories",
        AsyncMock(return_value=[]),
    ):
        result = await _guest_create_transaction(
            session, {"account_id": str(_ACC_ID), "amount": -20000}, [_account(_ACC_ID)]
        )

    assert "category_warning" in result


async def test_execute_guest_tool_dispatches_get_accounts() -> None:
    session = AsyncMock()
    raw = await execute_guest_tool("get_accounts", {}, session, [_account(_ACC_ID)])

    parsed = json.loads(raw)
    assert parsed["accounts"][0]["id"] == str(_ACC_ID)


async def test_execute_guest_tool_rejects_unknown_tool_name() -> None:
    session = AsyncMock()
    raw = await execute_guest_tool("delete_everything", {}, session, [])

    parsed = json.loads(raw)
    assert "error" in parsed


async def test_execute_guest_tool_never_crashes_on_internal_exception() -> None:
    session = AsyncMock()
    with patch(
        "app.domains.ai.guest_tools.finance_repo.list_system_categories",
        AsyncMock(side_effect=RuntimeError("boom")),
    ):
        raw = await execute_guest_tool(
            "create_transaction",
            {"account_id": str(_ACC_ID), "amount": -1000, "category_name": "x"},
            session,
            [_account(_ACC_ID)],
        )

    assert "error" in json.loads(raw)


def test_guest_tools_is_a_subset_of_the_authenticated_tool_schemas() -> None:
    names = {t["function"]["name"] for t in GUEST_TOOLS}
    assert names == {"get_accounts", "create_transaction"}
