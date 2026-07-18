"""AI function-calling tool definitions and async executors.

Each tool queries the finance domain via repository functions and returns a
JSON-serialisable dict. The router wraps results in json.dumps() before
passing back to the LLM.
"""

from __future__ import annotations

import json
import uuid
from datetime import UTC, date, datetime
from typing import Any

import sqlalchemy as sa
import structlog
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ConflictError, ForbiddenError, NotFoundError
from app.domains.finance import repository as repo
from app.domains.finance import service as finance_service
from app.domains.finance.models import Category, Transaction, TransactionSource, TransactionStatus
from app.domains.finance.schemas import TransactionCreate

_logger = structlog.get_logger(__name__)

# ── OpenAI-compatible tool schemas ────────────────────────────────────────────

TOOLS: list[dict[str, Any]] = [
    {
        "type": "function",
        "function": {
            "name": "get_financial_summary",
            "description": (
                "Get the user's total balance across all accounts and this month's "
                "total income and total expenses."
            ),
            "parameters": {"type": "object", "properties": {}, "required": []},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_accounts",
            "description": "List all user accounts with their current balances.",
            "parameters": {"type": "object", "properties": {}, "required": []},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_budget_status",
            "description": (
                "Get the user's monthly budget limit and how much has been spent "
                "and how much remains."
            ),
            "parameters": {"type": "object", "properties": {}, "required": []},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_recent_transactions",
            "description": (
                "Get recent confirmed transactions, optionally filtered by category name "
                "and/or by type (income or expense). Use type='income' for questions about "
                "money coming in (gaji, pemasukan) and type='expense' for spending."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "limit": {
                        "type": "integer",
                        "description": "Number of transactions to return (max 20, default 10)",
                    },
                    "category_name": {
                        "type": "string",
                        "description": "Filter by category name (partial, case-insensitive match)",
                    },
                    "type": {
                        "type": "string",
                        "enum": ["income", "expense"],
                        "description": (
                            "Filter by transaction type: income (positive amount) "
                            "or expense (negative amount)"
                        ),
                    },
                },
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_spending_by_category",
            "description": "Get total spending grouped by category for the current month.",
            "parameters": {"type": "object", "properties": {}, "required": []},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "create_transaction",
            "description": (
                "Create a draft transaction for the user to review and confirm. "
                "Always call get_accounts first to find a valid account_id. "
                "Amount must be negative for expenses (e.g. -50000) and positive for income. "
                "The draft will NOT affect account balance until the user confirms it in the app."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "account_id": {
                        "type": "string",
                        "description": "UUID of the account (get from get_accounts tool first)",
                    },
                    "amount": {
                        "type": "integer",
                        "description": (
                            "Amount in rupiah (negative for expense, positive for income)"
                        ),
                    },
                    "merchant": {
                        "type": "string",
                        "description": "Merchant or payee name",
                    },
                    "category_name": {
                        "type": "string",
                        "description": (
                            "Category name (e.g. 'Makan', 'Transport'). Backend will match by name."
                        ),
                    },
                    "note": {
                        "type": "string",
                        "description": "Optional note or description",
                    },
                    "occurred_at": {
                        "type": "string",
                        "description": (
                            "ISO 8601 datetime (e.g. '2026-06-15T12:00:00Z'). Defaults to now."
                        ),
                    },
                },
                "required": ["account_id", "amount"],
            },
        },
    },
]


# ── Formatters ────────────────────────────────────────────────────────────────


def _fmt(amount: int) -> str:
    """Format rupiah with Indonesian thousand separators (dots, not commas)."""
    return f"Rp {amount:,}".replace(",", ".")


_INDONESIAN_MONTHS = (
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember",
)  # fmt: skip


def _format_month_year(d: date) -> str:
    """Format a date as "<Indonesian month> <year>", independent of the OS
    locale (strftime('%B %Y') returns English month names in production —
    the default C/UTF-8 locale has no Indonesian month names installed)."""
    return f"{_INDONESIAN_MONTHS[d.month - 1]} {d.year}"


# ── Executors ─────────────────────────────────────────────────────────────────


async def _get_financial_summary(user_id: uuid.UUID, session: AsyncSession) -> dict[str, Any]:
    today = date.today()
    first = today.replace(day=1)

    accounts = await repo.list_accounts(session, user_id)
    total_balance = sum(a.balance for a in accounts)

    q = sa.select(
        sa.func.coalesce(
            sa.func.sum(sa.case((Transaction.amount > 0, Transaction.amount), else_=0)), 0
        ).label("income"),
        sa.func.coalesce(
            sa.func.sum(sa.case((Transaction.amount < 0, Transaction.amount), else_=0)), 0
        ).label("expense"),
    ).where(
        Transaction.user_id == user_id,
        Transaction.status == TransactionStatus.confirmed,
        sa.cast(sa.func.timezone("Asia/Jakarta", Transaction.occurred_at), sa.Date) >= first,
    )
    row = (await session.execute(q)).one()
    # SUM() over a bigint column returns Decimal from the DB driver; cast to
    # plain int so the result survives json.dumps() when handed back to the LLM.
    month_income = int(row.income)
    month_expense = abs(int(row.expense))

    return {
        "total_balance": total_balance,
        "total_balance_formatted": _fmt(total_balance),
        "month": _format_month_year(today),
        "month_income": month_income,
        "month_income_formatted": _fmt(month_income),
        "month_expense": month_expense,
        "month_expense_formatted": _fmt(month_expense),
    }


async def _get_accounts(user_id: uuid.UUID, session: AsyncSession) -> dict[str, Any]:
    accounts = await repo.list_accounts(session, user_id)
    total = sum(a.balance for a in accounts)
    return {
        "accounts": [
            {
                "id": str(a.id),
                "name": a.name,
                "type": a.type.value,
                "balance": a.balance,
                "balance_formatted": _fmt(a.balance),
                "currency": a.currency,
            }
            for a in accounts
        ],
        "total_balance": total,
        "total_balance_formatted": _fmt(total),
    }


async def _get_budget_status(user_id: uuid.UUID, session: AsyncSession) -> dict[str, Any]:
    today = date.today()
    first = today.replace(day=1)

    budget = await repo.get_budget(session, user_id)

    q = sa.select(sa.func.coalesce(sa.func.sum(Transaction.amount), 0)).where(
        Transaction.user_id == user_id,
        Transaction.amount < 0,
        Transaction.status == TransactionStatus.confirmed,
        sa.cast(sa.func.timezone("Asia/Jakarta", Transaction.occurred_at), sa.Date) >= first,
    )
    spent = abs(int((await session.execute(q)).scalar_one()))

    if budget is None:
        return {
            "has_budget": False,
            "message": "Belum ada budget bulanan yang diatur.",
            "month_spent": spent,
            "month_spent_formatted": _fmt(spent),
        }

    remaining = budget.monthly_limit - spent
    return {
        "has_budget": True,
        "monthly_limit": budget.monthly_limit,
        "monthly_limit_formatted": _fmt(budget.monthly_limit),
        "month_spent": spent,
        "month_spent_formatted": _fmt(spent),
        "remaining": remaining,
        "remaining_formatted": _fmt(remaining),
        "usage_pct": (
            round(spent / budget.monthly_limit * 100, 1) if budget.monthly_limit > 0 else 0
        ),
    }


_DEFAULT_RECENT_TRANSACTIONS_LIMIT = 10
_MAX_RECENT_TRANSACTIONS_LIMIT = 20


def _parse_limit(raw: Any, default: int = _DEFAULT_RECENT_TRANSACTIONS_LIMIT) -> int:
    """Coerce an LLM-supplied `limit` arg into a safe, bounded int.

    The LLM's tool-call args are untrusted free-form JSON: a non-numeric
    string must fall back to `default` (not crash the chat turn), and any
    numeric value must be clamped so it can't reach the DB as a 0/negative
    SQL LIMIT or an unbounded one.
    """
    try:
        value = int(raw)
    except (TypeError, ValueError):
        return default
    return max(1, min(value, _MAX_RECENT_TRANSACTIONS_LIMIT))


def _parse_tx_type(raw: Any) -> str | None:
    """Coerce an LLM-supplied `type` arg into "income", "expense", or None.

    Anything else (typos, non-English words, wrong type) falls back to no
    filter rather than raising, so a malformed arg degrades gracefully.
    """
    return raw if raw in ("income", "expense") else None


async def _get_recent_transactions(
    user_id: uuid.UUID,
    session: AsyncSession,
    *,
    limit: int = 10,
    category_name: str | None = None,
    tx_type: str | None = None,
) -> dict[str, Any]:
    q = (
        sa.select(Transaction, Category.name.label("cat"))
        .outerjoin(Category, Transaction.category_id == Category.id)
        .where(
            Transaction.user_id == user_id,
            Transaction.status == TransactionStatus.confirmed,
        )
    )
    if category_name is not None:
        q = q.where(Category.name.ilike(f"%{category_name}%"))
    if tx_type == "income":
        q = q.where(Transaction.amount > 0)
    elif tx_type == "expense":
        q = q.where(Transaction.amount < 0)
    q = q.order_by(Transaction.occurred_at.desc()).limit(min(limit, 20))

    rows = (await session.execute(q)).all()
    return {
        "transactions": [
            {
                "amount": row.Transaction.amount,
                "amount_formatted": _fmt(row.Transaction.amount),
                "merchant": row.Transaction.merchant,
                "category": row.cat,
                "date": row.Transaction.occurred_at.strftime("%Y-%m-%d"),
                "note": row.Transaction.note,
            }
            for row in rows
        ],
        "count": len(rows),
    }


async def _get_spending_by_category(user_id: uuid.UUID, session: AsyncSession) -> dict[str, Any]:
    today = date.today()
    first = today.replace(day=1)

    # Reuse the exact same expression object in SELECT and GROUP BY. Calling
    # coalesce() twice creates two distinct bind parameters for the same
    # "Uncategorized" literal, which Postgres then treats as two different
    # expressions and rejects with GroupingError — this crashed every
    # "spending by category" query in production, always, regardless of data.
    category_name_expr = sa.func.coalesce(Category.name, "Tanpa Kategori")
    q = (
        sa.select(
            category_name_expr.label("category"),
            sa.func.sum(Transaction.amount).label("total"),
        )
        .outerjoin(Category, Transaction.category_id == Category.id)
        .where(
            Transaction.user_id == user_id,
            Transaction.amount < 0,
            Transaction.status == TransactionStatus.confirmed,
            sa.cast(sa.func.timezone("Asia/Jakarta", Transaction.occurred_at), sa.Date) >= first,
        )
        .group_by(category_name_expr)
        .order_by(sa.func.sum(Transaction.amount).asc())
        .limit(10)
    )
    rows = (await session.execute(q)).all()

    return {
        "month": _format_month_year(today),
        "categories": [
            {
                "name": row.category,
                "amount": abs(int(row.total)),
                "amount_formatted": _fmt(abs(int(row.total))),
            }
            for row in rows
        ],
    }


async def _create_transaction(
    user_id: uuid.UUID,
    session: AsyncSession,
    args: dict[str, Any],
    *,
    chat_session_id: uuid.UUID | None = None,
) -> dict[str, Any]:
    try:
        account_id = uuid.UUID(str(args["account_id"]))
    except (KeyError, ValueError):
        return {"error": "Invalid or missing account_id (must be a valid UUID)"}

    amount = args.get("amount")
    if not isinstance(amount, int):
        return {"error": "amount must be an integer (rupiah)"}

    category_id: uuid.UUID | None = None
    category_name_resolved: str | None = None
    category_warning: str | None = None
    requested_category = args.get("category_name")
    if requested_category:
        cat_row = await session.execute(
            sa.select(Category).where(
                sa.or_(Category.user_id == user_id, Category.user_id.is_(None)),
                Category.name.ilike(f"%{requested_category}%"),
            )
        )
        cat = cat_row.scalars().first()
        if cat:
            category_id = cat.id
            category_name_resolved = cat.name
        else:
            category_warning = (
                f"category_name '{requested_category}' did not match any of the user's "
                "categories — the draft was created WITHOUT a category. Next time pick a "
                "name exactly from the category list in your instructions."
            )
            _logger.warning("ai_category_unresolved", requested=str(requested_category))
    else:
        category_warning = (
            "no category_name was given — the draft was created WITHOUT a category. "
            "Always pick the closest name from the category list in your instructions."
        )
        _logger.warning("ai_category_missing")

    occurred_at: datetime
    if args.get("occurred_at"):
        try:
            occurred_at = datetime.fromisoformat(str(args["occurred_at"]).replace("Z", "+00:00"))
        except ValueError:
            occurred_at = datetime.now(UTC)
    else:
        occurred_at = datetime.now(UTC)

    try:
        tx = await finance_service.create_transaction(
            session,
            user_id,
            TransactionCreate(
                account_id=account_id,
                amount=amount,
                merchant=args.get("merchant"),
                category_id=category_id,
                note=args.get("note"),
                occurred_at=occurred_at,
                source=TransactionSource.manual,
                status=TransactionStatus.draft,
                chat_session_id=chat_session_id,
            ),
        )
    except (NotFoundError, ForbiddenError, ConflictError) as exc:
        return {"error": str(exc)}

    account = await repo.get_account(session, account_id)
    currency = account.currency if account else "IDR"

    result: dict[str, Any] = {
        "transaction_id": str(tx.id),
        "amount": tx.amount,
        "currency": currency,
        "merchant": tx.merchant,
        "category_name": category_name_resolved,
        "note": tx.note,
        "account_id": str(tx.account_id),
    }
    if category_warning:
        result["category_warning"] = category_warning
    return result


# ── Dispatcher ────────────────────────────────────────────────────────────────


async def execute_tool(
    name: str,
    args: dict[str, Any],
    user_id: uuid.UUID,
    session: AsyncSession,
    *,
    chat_session_id: uuid.UUID | None = None,
) -> str:
    """Dispatch a tool call and return its result as a JSON string.

    Any unexpected exception (DB error, bad LLM-supplied args, etc.) is
    caught here so a single failing tool call can never kill the whole chat
    turn — the model gets a graceful {"error": ...} payload back instead and
    can apologize or retry with different args.

    `chat_session_id` comes from the server-side chat session, never from
    model-supplied args, so create_transaction drafts can always be traced
    back to (and rehydrated from) the chat that created them.
    """
    try:
        result = await _dispatch_tool(name, args, user_id, session, chat_session_id)
    except Exception as exc:
        _logger.error(
            "ai_tool_execution_failed",
            tool_name=name,
            error_type=type(exc).__name__,
            detail=str(exc),
        )
        result = {"error": f"Tool '{name}' failed unexpectedly. Please try again."}

    return json.dumps(result)


async def _dispatch_tool(
    name: str,
    args: dict[str, Any],
    user_id: uuid.UUID,
    session: AsyncSession,
    chat_session_id: uuid.UUID | None,
) -> dict[str, Any]:
    if name == "get_financial_summary":
        return await _get_financial_summary(user_id, session)
    if name == "get_accounts":
        return await _get_accounts(user_id, session)
    if name == "get_budget_status":
        return await _get_budget_status(user_id, session)
    if name == "get_recent_transactions":
        return await _get_recent_transactions(
            user_id,
            session,
            limit=_parse_limit(args.get("limit")),
            category_name=args.get("category_name"),
            tx_type=_parse_tx_type(args.get("type")),
        )
    if name == "get_spending_by_category":
        return await _get_spending_by_category(user_id, session)
    if name == "create_transaction":
        return await _create_transaction(user_id, session, args, chat_session_id=chat_session_id)
    return {"error": f"Unknown tool: {name}"}
