"""Unit tests for AI tool executors (DB is mocked)."""

from __future__ import annotations

import json
import uuid
from datetime import UTC, date, datetime
from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.core.exceptions import ConflictError
from app.domains.ai.tools import (
    _create_transaction,
    _fmt,
    _format_month_year,
    _get_accounts,
    _get_budget_status,
    _get_financial_summary,
    _get_spending_by_category,
    _parse_limit,
    _parse_tx_type,
    execute_tool,
)

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


def test_fmt_uses_indonesian_thousand_separator() -> None:
    assert _fmt(50_000) == "Rp 50.000"
    assert _fmt(1_250_000) == "Rp 1.250.000"


@pytest.mark.parametrize(
    ("d", "expected"),
    [
        (date(2026, 1, 15), "Januari 2026"),
        (date(2026, 7, 8), "Juli 2026"),
        (date(2026, 12, 31), "Desember 2026"),
    ],
)
def test_format_month_year_is_indonesian(d: date, expected: str) -> None:
    """strftime('%B %Y') depends on the OS locale and returns English month
    names in production (verified: default C/UTF-8 locale gives "July 2026").
    This must not depend on locale at all."""
    assert _format_month_year(d) == expected


@pytest.mark.parametrize(
    ("raw", "expected"),
    [
        (None, None),
        ("income", "income"),
        ("expense", "expense"),
        ("pemasukan", None),
        (123, None),
    ],
)
def test_parse_tx_type(raw: object, expected: str | None) -> None:
    assert _parse_tx_type(raw) == expected


@pytest.mark.asyncio
async def test_get_financial_summary_returns_json_serializable_ints() -> None:
    """Postgres SUM() over a bigint column returns Decimal; the tool result
    must be plain int or json.dumps() raises TypeError and the whole chat
    turn dies (this reproduces a real crash seen against real Postgres)."""
    session = AsyncMock()
    row = MagicMock()
    row.income = Decimal("500000")
    row.expense = Decimal("-200000")
    mock_result = MagicMock()
    mock_result.one.return_value = row
    session.execute = AsyncMock(return_value=mock_result)

    with patch("app.domains.ai.tools.repo.list_accounts", AsyncMock(return_value=[])):
        result = await _get_financial_summary(_USER_ID, session)

    json.dumps(result)  # must not raise TypeError
    assert result["month_income"] == 500_000
    assert result["month_expense"] == 200_000
    assert isinstance(result["month_income"], int)
    assert isinstance(result["month_expense"], int)


@pytest.mark.asyncio
async def test_get_budget_status_returns_json_serializable_ints() -> None:
    session = AsyncMock()
    mock_result = MagicMock()
    mock_result.scalar_one.return_value = Decimal("-150000")
    session.execute = AsyncMock(return_value=mock_result)
    budget = MagicMock()
    budget.monthly_limit = 1_000_000

    with patch("app.domains.ai.tools.repo.get_budget", AsyncMock(return_value=budget)):
        result = await _get_budget_status(_USER_ID, session)

    json.dumps(result)
    assert result["month_spent"] == 150_000
    assert result["remaining"] == 850_000
    assert isinstance(result["month_spent"], int)
    assert isinstance(result["remaining"], int)


@pytest.mark.asyncio
async def test_get_spending_by_category_returns_json_serializable_ints() -> None:
    session = AsyncMock()
    row = MagicMock()
    row.category = "Makan"
    row.total = Decimal("-75000")
    mock_result = MagicMock()
    mock_result.all.return_value = [row]
    session.execute = AsyncMock(return_value=mock_result)

    result = await _get_spending_by_category(_USER_ID, session)

    json.dumps(result)
    assert result["categories"][0]["amount"] == 75_000
    assert isinstance(result["categories"][0]["amount"], int)


@pytest.mark.asyncio
async def test_get_budget_status_no_budget_message_is_indonesian() -> None:
    session = AsyncMock()
    mock_result = MagicMock()
    mock_result.scalar_one.return_value = Decimal("0")
    session.execute = AsyncMock(return_value=mock_result)

    with patch("app.domains.ai.tools.repo.get_budget", AsyncMock(return_value=None)):
        result = await _get_budget_status(_USER_ID, session)

    assert result["message"] == "Belum ada budget bulanan yang diatur."


@pytest.mark.asyncio
async def test_execute_tool_returns_error_json_on_unexpected_exception() -> None:
    """A tool crashing (DB error, bad LLM args, etc.) must not kill the whole
    chat turn — it should hand the model a graceful {"error": ...} payload."""
    session = AsyncMock()
    session.execute = AsyncMock(side_effect=RuntimeError("db exploded"))

    raw_result = await execute_tool("get_financial_summary", {}, _USER_ID, session)

    result = json.loads(raw_result)
    assert "error" in result


@pytest.mark.asyncio
async def test_create_transaction_stamps_chat_session_id() -> None:
    """Drafts created by the AI must remember which chat session spawned them
    so the app can rehydrate the draft card if the chat is reopened before
    the user confirms or cancels it."""
    chat_session_id = uuid.uuid4()
    account_id = uuid.uuid4()
    session = AsyncMock()

    created_tx = MagicMock()
    created_tx.id = uuid.uuid4()
    created_tx.amount = -20_000
    created_tx.merchant = "Sate"
    created_tx.note = None
    created_tx.account_id = account_id

    with (
        patch(
            "app.domains.ai.tools.finance_service.create_transaction",
            AsyncMock(return_value=created_tx),
        ) as mock_create,
        patch("app.domains.ai.tools.repo.get_account", AsyncMock(return_value=None)),
    ):
        await _create_transaction(
            _USER_ID,
            session,
            {"account_id": str(account_id), "amount": -20_000},
            chat_session_id=chat_session_id,
        )

    call_args = mock_create.call_args.args[-1]
    assert call_args.chat_session_id == chat_session_id


@pytest.mark.asyncio
async def test_create_transaction_result_includes_occurred_at() -> None:
    """The draft card's edit form (mobile ConfirmCard) needs the transaction's
    occurred_at to show/let the user change the date — the result dict must
    carry it, not just created_at (row insert time)."""
    account_id = uuid.uuid4()
    session = AsyncMock()
    occurred_at = datetime(2026, 1, 5, 8, 0, 0, tzinfo=UTC)

    created_tx = MagicMock()
    created_tx.id = uuid.uuid4()
    created_tx.amount = -20_000
    created_tx.merchant = "Sate"
    created_tx.note = None
    created_tx.account_id = account_id
    created_tx.occurred_at = occurred_at

    with (
        patch(
            "app.domains.ai.tools.finance_service.create_transaction",
            AsyncMock(return_value=created_tx),
        ),
        patch("app.domains.ai.tools.repo.get_account", AsyncMock(return_value=None)),
    ):
        result = await _create_transaction(
            _USER_ID,
            session,
            {"account_id": str(account_id), "amount": -20_000},
            chat_session_id=uuid.uuid4(),
        )

    assert result["occurred_at"] == occurred_at.isoformat()


@pytest.mark.asyncio
async def test_create_transaction_forwards_dedupe_before_to_service() -> None:
    """dedupe_before (the turn's start time) must reach finance_service so the
    same-turn dedupe collision (Bug 3) stays fixed end-to-end."""
    account_id = uuid.uuid4()
    session = AsyncMock()
    turn_start = datetime(2026, 1, 1, 12, 0, 0, tzinfo=UTC)

    created_tx = MagicMock()
    created_tx.id = uuid.uuid4()
    created_tx.amount = -20_000
    created_tx.merchant = "Sate"
    created_tx.note = None
    created_tx.account_id = account_id

    with (
        patch(
            "app.domains.ai.tools.finance_service.create_transaction",
            AsyncMock(return_value=created_tx),
        ) as mock_create,
        patch("app.domains.ai.tools.repo.get_account", AsyncMock(return_value=None)),
    ):
        await _create_transaction(
            _USER_ID,
            session,
            {"account_id": str(account_id), "amount": -20_000},
            chat_session_id=uuid.uuid4(),
            dedupe_before=turn_start,
        )

    assert mock_create.call_args.kwargs["dedupe_before"] == turn_start


@pytest.mark.asyncio
async def test_create_transaction_returns_error_on_duplicate_pending_draft() -> None:
    """A ConflictError from the service layer (duplicate pending draft) must
    surface as a tool error, not crash the chat turn."""
    account_id = uuid.uuid4()
    session = AsyncMock()

    with patch(
        "app.domains.ai.tools.finance_service.create_transaction",
        AsyncMock(side_effect=ConflictError("Duplicate pending draft")),
    ):
        result = await _create_transaction(
            _USER_ID,
            session,
            {"account_id": str(account_id), "amount": -10_000, "merchant": "Kopi"},
            chat_session_id=uuid.uuid4(),
        )

    assert "error" in result


@pytest.mark.asyncio
async def test_execute_tool_threads_chat_session_id_to_create_transaction() -> None:
    chat_session_id = uuid.uuid4()
    session = AsyncMock()

    with patch(
        "app.domains.ai.tools._create_transaction", AsyncMock(return_value={})
    ) as mock_create_transaction:
        await execute_tool(
            "create_transaction", {}, _USER_ID, session, chat_session_id=chat_session_id
        )

    mock_create_transaction.assert_awaited_once_with(
        _USER_ID, session, {}, chat_session_id=chat_session_id, dedupe_before=None
    )


@pytest.mark.asyncio
async def test_execute_tool_threads_dedupe_before_to_create_transaction() -> None:
    chat_session_id = uuid.uuid4()
    turn_start = datetime(2026, 1, 1, 12, 0, 0, tzinfo=UTC)
    session = AsyncMock()

    with patch(
        "app.domains.ai.tools._create_transaction", AsyncMock(return_value={})
    ) as mock_create_transaction:
        await execute_tool(
            "create_transaction",
            {},
            _USER_ID,
            session,
            chat_session_id=chat_session_id,
            dedupe_before=turn_start,
        )

    mock_create_transaction.assert_awaited_once_with(
        _USER_ID, session, {}, chat_session_id=chat_session_id, dedupe_before=turn_start
    )


def _tx_session(found_category: MagicMock | None) -> AsyncMock:
    """AsyncMock session whose category lookup resolves to `found_category`."""
    session = AsyncMock()
    scalars = MagicMock()
    scalars.first.return_value = found_category
    result = MagicMock()
    result.scalars.return_value = scalars
    session.execute = AsyncMock(return_value=result)
    return session


def _created_tx(account_id: uuid.UUID) -> MagicMock:
    tx = MagicMock()
    tx.id = uuid.uuid4()
    tx.amount = -30_000
    tx.merchant = None
    tx.note = None
    tx.account_id = account_id
    return tx


@pytest.mark.asyncio
async def test_create_transaction_warns_when_category_name_unmatched() -> None:
    """A category_name that matches nothing must not fail the draft, but the
    tool result must carry a warning so the model can correct itself."""
    account_id = uuid.uuid4()
    session = _tx_session(found_category=None)

    with (
        patch(
            "app.domains.ai.tools.finance_service.create_transaction",
            AsyncMock(return_value=_created_tx(account_id)),
        ),
        patch("app.domains.ai.tools.repo.get_account", AsyncMock(return_value=None)),
    ):
        result = await _create_transaction(
            _USER_ID,
            session,
            {"account_id": str(account_id), "amount": -30_000, "category_name": "Makanan Berat"},
            chat_session_id=uuid.uuid4(),
        )

    assert "transaction_id" in result
    assert result["category_name"] is None
    assert "Makanan Berat" in result["category_warning"]


@pytest.mark.asyncio
async def test_create_transaction_warns_when_category_name_missing() -> None:
    account_id = uuid.uuid4()
    session = _tx_session(found_category=None)

    with (
        patch(
            "app.domains.ai.tools.finance_service.create_transaction",
            AsyncMock(return_value=_created_tx(account_id)),
        ),
        patch("app.domains.ai.tools.repo.get_account", AsyncMock(return_value=None)),
    ):
        result = await _create_transaction(
            _USER_ID,
            session,
            {"account_id": str(account_id), "amount": -30_000},
            chat_session_id=uuid.uuid4(),
        )

    assert "transaction_id" in result
    assert "category_warning" in result


@pytest.mark.asyncio
async def test_create_transaction_no_warning_when_category_matches() -> None:
    account_id = uuid.uuid4()
    cat = MagicMock()
    cat.id = uuid.uuid4()
    cat.name = "Makan & Jajan"
    session = _tx_session(found_category=cat)

    with (
        patch(
            "app.domains.ai.tools.finance_service.create_transaction",
            AsyncMock(return_value=_created_tx(account_id)),
        ),
        patch("app.domains.ai.tools.repo.get_account", AsyncMock(return_value=None)),
    ):
        result = await _create_transaction(
            _USER_ID,
            session,
            {"account_id": str(account_id), "amount": -30_000, "category_name": "makan"},
            chat_session_id=uuid.uuid4(),
        )

    assert result["category_name"] == "Makan & Jajan"
    assert "category_warning" not in result
