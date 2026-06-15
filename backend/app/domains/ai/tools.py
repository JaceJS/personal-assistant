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
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ForbiddenError, NotFoundError
from app.domains.finance import repository as repo
from app.domains.finance import service as finance_service
from app.domains.finance.models import Category, Transaction, TransactionSource, TransactionStatus
from app.domains.finance.schemas import TransactionCreate

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
                "Get recent confirmed transactions, optionally filtered by category name."
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
                            "Amount in rupiah — negative for expense, positive for income"
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
    return f"Rp {amount:,}"


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
        sa.cast(Transaction.occurred_at, sa.Date) >= first,
    )
    row = (await session.execute(q)).one()

    return {
        "total_balance": total_balance,
        "total_balance_formatted": _fmt(total_balance),
        "month": today.strftime("%B %Y"),
        "month_income": row.income,
        "month_income_formatted": _fmt(row.income),
        "month_expense": abs(row.expense),
        "month_expense_formatted": _fmt(abs(row.expense)),
    }


async def _get_accounts(user_id: uuid.UUID, session: AsyncSession) -> dict[str, Any]:
    accounts = await repo.list_accounts(session, user_id)
    total = sum(a.balance for a in accounts)
    return {
        "accounts": [
            {
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
        sa.cast(Transaction.occurred_at, sa.Date) >= first,
    )
    spent = abs((await session.execute(q)).scalar_one())

    if budget is None:
        return {
            "has_budget": False,
            "message": "No monthly budget configured.",
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


async def _get_recent_transactions(
    user_id: uuid.UUID,
    session: AsyncSession,
    *,
    limit: int = 10,
    category_name: str | None = None,
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

    q = (
        sa.select(
            sa.func.coalesce(Category.name, "Uncategorized").label("category"),
            sa.func.sum(Transaction.amount).label("total"),
        )
        .outerjoin(Category, Transaction.category_id == Category.id)
        .where(
            Transaction.user_id == user_id,
            Transaction.amount < 0,
            Transaction.status == TransactionStatus.confirmed,
            sa.cast(Transaction.occurred_at, sa.Date) >= first,
        )
        .group_by(sa.func.coalesce(Category.name, "Uncategorized"))
        .order_by(sa.func.sum(Transaction.amount).asc())
        .limit(10)
    )
    rows = (await session.execute(q)).all()

    return {
        "month": today.strftime("%B %Y"),
        "categories": [
            {
                "name": row.category,
                "amount": abs(row.total),
                "amount_formatted": _fmt(abs(row.total)),
            }
            for row in rows
        ],
    }


async def _create_transaction(
    user_id: uuid.UUID,
    session: AsyncSession,
    args: dict[str, Any],
) -> dict[str, Any]:
    try:
        account_id = uuid.UUID(str(args["account_id"]))
    except (KeyError, ValueError):
        return {"error": "Invalid or missing account_id — must be a valid UUID"}

    amount = args.get("amount")
    if not isinstance(amount, int):
        return {"error": "amount must be an integer (rupiah)"}

    category_id: uuid.UUID | None = None
    category_name_resolved: str | None = None
    if args.get("category_name"):
        cat_row = await session.execute(
            sa.select(Category).where(
                sa.or_(Category.user_id == user_id, Category.user_id.is_(None)),
                Category.name.ilike(f"%{args['category_name']}%"),
            )
        )
        cat = cat_row.scalars().first()
        if cat:
            category_id = cat.id
            category_name_resolved = cat.name

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
            ),
        )
    except (NotFoundError, ForbiddenError) as exc:
        return {"error": str(exc)}

    account = await repo.get_account(session, account_id)
    currency = account.currency if account else "IDR"

    return {
        "transaction_id": str(tx.id),
        "amount": tx.amount,
        "currency": currency,
        "merchant": tx.merchant,
        "category_name": category_name_resolved,
        "note": tx.note,
        "account_id": str(tx.account_id),
    }


# ── Dispatcher ────────────────────────────────────────────────────────────────


async def execute_tool(
    name: str,
    args: dict[str, Any],
    user_id: uuid.UUID,
    session: AsyncSession,
) -> str:
    """Dispatch a tool call and return its result as a JSON string."""
    if name == "get_financial_summary":
        result = await _get_financial_summary(user_id, session)
    elif name == "get_accounts":
        result = await _get_accounts(user_id, session)
    elif name == "get_budget_status":
        result = await _get_budget_status(user_id, session)
    elif name == "get_recent_transactions":
        result = await _get_recent_transactions(
            user_id,
            session,
            limit=int(args.get("limit", 10)),
            category_name=args.get("category_name"),
        )
    elif name == "get_spending_by_category":
        result = await _get_spending_by_category(user_id, session)
    elif name == "create_transaction":
        result = await _create_transaction(user_id, session, args)
    else:
        result = {"error": f"Unknown tool: {name}"}

    return json.dumps(result)
