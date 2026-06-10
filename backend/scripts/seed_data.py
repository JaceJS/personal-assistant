"""Insert system-default categories (user_id=NULL, shared by all users).

Run once after the initial migration:
    cd backend
    uv run python scripts/seed_data.py

Re-running is safe: categories that already exist (matched by name) are skipped.
"""

from __future__ import annotations

import asyncio

import sqlalchemy as sa
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine

from app.core.config import get_settings
from app.domains.finance.models import Category, CategoryType

# 20 system categories — emoji icons, consistent palette
_DEFAULT_CATEGORIES: list[dict[str, object]] = [
    # ── Expense (13) ──────────────────────────────────────────────────────────
    {
        "name": "Food & Dining",
        "type": CategoryType.expense,
        "icon": "🍔",
        "color": "#E17055",
    },
    {
        "name": "Groceries",
        "type": CategoryType.expense,
        "icon": "🛒",
        "color": "#FDCB6E",
    },
    {
        "name": "Transport",
        "type": CategoryType.expense,
        "icon": "🚌",
        "color": "#00CEC9",
    },
    {
        "name": "Shopping",
        "type": CategoryType.expense,
        "icon": "🛍️",
        "color": "#6C5CE7",
    },
    {
        "name": "Health & Medical",
        "type": CategoryType.expense,
        "icon": "💊",
        "color": "#00B894",
    },
    {
        "name": "Entertainment",
        "type": CategoryType.expense,
        "icon": "🎬",
        "color": "#FFEAA7",
    },
    {
        "name": "Bills & Utilities",
        "type": CategoryType.expense,
        "icon": "⚡",
        "color": "#A29BFE",
    },
    {
        "name": "Rent & Housing",
        "type": CategoryType.expense,
        "icon": "🏠",
        "color": "#FD79A8",
    },
    {
        "name": "Education",
        "type": CategoryType.expense,
        "icon": "📚",
        "color": "#74B9FF",
    },
    {
        "name": "Travel",
        "type": CategoryType.expense,
        "icon": "✈️",
        "color": "#FF7675",
    },
    {
        "name": "Beauty & Wellness",
        "type": CategoryType.expense,
        "icon": "💆",
        "color": "#FD79A8",
    },
    {
        "name": "Fitness & Sports",
        "type": CategoryType.expense,
        "icon": "🏃",
        "color": "#55EFC4",
    },
    {
        "name": "Subscriptions",
        "type": CategoryType.expense,
        "icon": "📲",
        "color": "#636E72",
    },
    # ── Income (5) ────────────────────────────────────────────────────────────
    {
        "name": "Salary",
        "type": CategoryType.income,
        "icon": "💼",
        "color": "#00B894",
    },
    {
        "name": "Freelance",
        "type": CategoryType.income,
        "icon": "💻",
        "color": "#6C5CE7",
    },
    {
        "name": "Investment",
        "type": CategoryType.income,
        "icon": "📈",
        "color": "#F9CA24",
    },
    {
        "name": "Business",
        "type": CategoryType.income,
        "icon": "🏪",
        "color": "#F0932B",
    },
    {
        "name": "Gift & Bonus",
        "type": CategoryType.income,
        "icon": "🎁",
        "color": "#EB4D4B",
    },
    # ── Transfer (2) ──────────────────────────────────────────────────────────
    {
        "name": "Transfer",
        "type": CategoryType.transfer,
        "icon": "🔄",
        "color": "#B2BEC3",
    },
    {
        "name": "Savings",
        "type": CategoryType.transfer,
        "icon": "🏦",
        "color": "#74B9FF",
    },
]


async def seed() -> None:
    settings = get_settings()
    engine = create_async_engine(settings.database_url)

    async with AsyncSession(engine, expire_on_commit=False) as session:
        # Load names of existing system categories to skip duplicates
        result = await session.execute(
            sa.select(Category.name).where(Category.user_id.is_(None))
        )
        existing_names: set[str] = {row[0] for row in result}

        added = 0
        for data in _DEFAULT_CATEGORIES:
            if data["name"] in existing_names:
                continue
            session.add(Category(user_id=None, **data))
            added += 1

        await session.commit()

    await engine.dispose()
    skipped = len(_DEFAULT_CATEGORIES) - added
    print(f"Seeded {added} categories. Skipped {skipped} already-existing.")


if __name__ == "__main__":
    asyncio.run(seed())
