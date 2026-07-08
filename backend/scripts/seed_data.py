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

# 35 system categories: emoji icons, consistent palette, mixed EN/ID naming
_DEFAULT_CATEGORIES: list[dict[str, object]] = [
    # ── Expense (27) ─────────────────────────────────────────────────────────
    {
        "name": "Makan & Jajan",
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
        "name": "Ojek & Transport",
        "type": CategoryType.expense,
        "icon": "🛵",
        "color": "#00CEC9",
    },
    {
        "name": "Bensin & Service",
        "type": CategoryType.expense,
        "icon": "⛽",
        "color": "#E67E22",
    },
    {
        "name": "Shopping",
        "type": CategoryType.expense,
        "icon": "🛍️",
        "color": "#6C5CE7",
    },
    {
        "name": "Gadget & Elektronik",
        "type": CategoryType.expense,
        "icon": "📱",
        "color": "#0984E3",
    },
    {
        "name": "Kesehatan",
        "type": CategoryType.expense,
        "icon": "💊",
        "color": "#00B894",
    },
    {
        "name": "Skincare & Self Care",
        "type": CategoryType.expense,
        "icon": "🧴",
        "color": "#81ECEC",
    },
    {
        "name": "Beauty & Wellness",
        "type": CategoryType.expense,
        "icon": "💆",
        "color": "#FAB1A0",
    },
    {
        "name": "Gym & Olahraga",
        "type": CategoryType.expense,
        "icon": "🏃",
        "color": "#55EFC4",
    },
    {
        "name": "Hiburan",
        "type": CategoryType.expense,
        "icon": "🎬",
        "color": "#FFEAA7",
    },
    {
        "name": "Self Reward",
        "type": CategoryType.expense,
        "icon": "🎉",
        "color": "#E84393",
    },
    {
        "name": "Tagihan",
        "type": CategoryType.expense,
        "icon": "⚡",
        "color": "#A29BFE",
    },
    {
        "name": "Pulsa & Internet",
        "type": CategoryType.expense,
        "icon": "📶",
        "color": "#45AAF2",
    },
    {
        "name": "Kos & Rumah",
        "type": CategoryType.expense,
        "icon": "🏠",
        "color": "#FD79A8",
    },
    {
        "name": "Perlengkapan Rumah",
        "type": CategoryType.expense,
        "icon": "🧹",
        "color": "#95AFC0",
    },
    {
        "name": "Pendidikan",
        "type": CategoryType.expense,
        "icon": "📚",
        "color": "#74B9FF",
    },
    {
        "name": "Keluarga & Anak",
        "type": CategoryType.expense,
        "icon": "🧸",
        "color": "#F8A5C2",
    },
    {
        "name": "Pet Care",
        "type": CategoryType.expense,
        "icon": "🐾",
        "color": "#C7ECEE",
    },
    {
        "name": "Liburan & Travel",
        "type": CategoryType.expense,
        "icon": "✈️",
        "color": "#FF7675",
    },
    {
        "name": "Subscription",
        "type": CategoryType.expense,
        "icon": "📲",
        "color": "#636E72",
    },
    {
        "name": "Asuransi",
        "type": CategoryType.expense,
        "icon": "🛡️",
        "color": "#22A6B3",
    },
    {
        "name": "Cicilan & Utang",
        "type": CategoryType.expense,
        "icon": "💳",
        "color": "#EB2F06",
    },
    {
        "name": "Pajak",
        "type": CategoryType.expense,
        "icon": "🧾",
        "color": "#576574",
    },
    {
        "name": "Hadiah & Donasi",
        "type": CategoryType.expense,
        "icon": "🎗️",
        "color": "#F368E0",
    },
    {
        "name": "Zakat & Charity",
        "type": CategoryType.expense,
        "icon": "🕌",
        "color": "#10AC84",
    },
    {
        "name": "Nabung & Savings",
        "type": CategoryType.expense,
        "icon": "🐷",
        "color": "#786FA6",
    },
    # ── Income (8) ───────────────────────────────────────────────────────────
    {
        "name": "Gaji",
        "type": CategoryType.income,
        "icon": "💼",
        "color": "#F6B93B",
    },
    {
        "name": "Freelance",
        "type": CategoryType.income,
        "icon": "💻",
        "color": "#4834D4",
    },
    {
        "name": "Investasi",
        "type": CategoryType.income,
        "icon": "📈",
        "color": "#F9CA24",
    },
    {
        "name": "Bisnis",
        "type": CategoryType.income,
        "icon": "🏪",
        "color": "#F0932B",
    },
    {
        "name": "Bonus & THR",
        "type": CategoryType.income,
        "icon": "🎁",
        "color": "#EB4D4B",
    },
    {
        "name": "Rental Income",
        "type": CategoryType.income,
        "icon": "🏘️",
        "color": "#6AB04C",
    },
    {
        "name": "Refund & Reimburse",
        "type": CategoryType.income,
        "icon": "💵",
        "color": "#2E86DE",
    },
    {
        "name": "Pemasukan Lain",
        "type": CategoryType.income,
        "icon": "💰",
        "color": "#8E44AD",
    },
]


async def seed() -> None:
    settings = get_settings()
    engine = create_async_engine(settings.database_url)

    async with AsyncSession(engine, expire_on_commit=False) as session:
        # Load names of existing system categories to skip duplicates
        result = await session.execute(sa.select(Category.name).where(Category.user_id.is_(None)))
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
