"""Tool executors for the anonymous guest chat.

Mirrors app.domains.ai.tools for the two tools a guest is allowed to use, but
every executor here operates on a client-supplied snapshot of local data
instead of Postgres — a guest has no `user_id` and no server-side rows to
read or write. create_transaction never persists anything: it returns a
draft dict the client applies to its own local storage on confirm. The one
exception is category resolution, which reads Postgres system categories
(`user_id IS NULL` rows) — those are public by design (see finance_repo) so
no ownership check applies.
"""

from __future__ import annotations

import json
import uuid
from datetime import UTC, datetime
from typing import Any

import structlog
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.ai.schemas import GuestAccountSnapshot
from app.domains.ai.tools import TOOLS, _fmt
from app.domains.finance import repository as finance_repo

_logger = structlog.get_logger(__name__)

_GUEST_TOOL_NAMES = {"get_accounts", "create_transaction"}
GUEST_TOOLS: list[dict[str, Any]] = [t for t in TOOLS if t["function"]["name"] in _GUEST_TOOL_NAMES]


async def _guest_get_accounts(accounts: list[GuestAccountSnapshot]) -> dict[str, Any]:
    total = sum(a.balance for a in accounts)
    return {
        "accounts": [
            {
                "id": str(a.id),
                "name": a.name,
                "balance": a.balance,
                "balance_formatted": _fmt(a.balance),
                "currency": a.currency,
            }
            for a in accounts
        ],
        "total_balance": total,
        "total_balance_formatted": _fmt(total),
    }


async def _guest_create_transaction(
    session: AsyncSession,
    args: dict[str, Any],
    accounts: list[GuestAccountSnapshot],
) -> dict[str, Any]:
    try:
        account_id = uuid.UUID(str(args["account_id"]))
    except (KeyError, ValueError):
        return {"error": "Invalid or missing account_id (must be a valid UUID)"}

    account = next((a for a in accounts if a.id == account_id), None)
    if account is None:
        return {"error": "account_id does not match any of the provided accounts"}

    amount = args.get("amount")
    if not isinstance(amount, int):
        return {"error": "amount must be an integer (rupiah)"}

    category_name_resolved: str | None = None
    category_warning: str | None = None
    requested_category = args.get("category_name")
    system_categories = await finance_repo.list_system_categories(session)
    if requested_category:
        requested_lower = str(requested_category).lower()
        match = next(
            (c for c in system_categories if requested_lower in c.name.lower()), None
        )
        if match:
            category_name_resolved = match.name
        else:
            category_warning = (
                f"category_name '{requested_category}' did not match any category — "
                "the draft was created WITHOUT a category."
            )
            _logger.warning("guest_ai_category_unresolved", requested=str(requested_category))
    else:
        category_warning = "no category_name was given — the draft was created WITHOUT a category."
        _logger.warning("guest_ai_category_missing")

    result: dict[str, Any] = {
        "transaction_id": str(uuid.uuid4()),
        "amount": amount,
        "currency": account.currency,
        "merchant": args.get("merchant"),
        "category_name": category_name_resolved,
        "note": args.get("note"),
        "account_id": str(account.id),
        "status": "draft",
        "created_at": datetime.now(UTC).isoformat(),
        "occurred_at": datetime.now(UTC).isoformat(),
    }
    if category_warning:
        result["category_warning"] = category_warning
    return result


async def execute_guest_tool(
    name: str,
    args: dict[str, Any],
    session: AsyncSession,
    accounts: list[GuestAccountSnapshot],
) -> str:
    """Dispatch a guest tool call and return its result as a JSON string.

    Same crash-isolation contract as execute_tool: any unexpected exception
    becomes a graceful {"error": ...} payload instead of killing the turn.
    """
    try:
        if name == "get_accounts":
            result = await _guest_get_accounts(accounts)
        elif name == "create_transaction":
            result = await _guest_create_transaction(session, args, accounts)
        else:
            result = {"error": f"Unknown tool: {name}"}
    except Exception as exc:
        _logger.error(
            "guest_ai_tool_execution_failed",
            tool_name=name,
            error_type=type(exc).__name__,
            detail=str(exc),
        )
        result = {"error": f"Tool '{name}' failed unexpectedly. Please try again."}

    return json.dumps(result)
