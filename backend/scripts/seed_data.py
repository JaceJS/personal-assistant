"""Insert system-default categories (user_id=NULL, shared by all users).

Run once after the initial migration:
    cd backend
    uv run python scripts/seed_data.py
"""

from __future__ import annotations

import asyncio

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine

from app.core.config import get_settings
from app.domains.finance.models import Category, CategoryType

_DEFAULT_CATEGORIES: list[dict[str, object]] = [
    {"name": "Food & Drink", "type": CategoryType.expense, "icon": "food", "color": "#FF6B6B"},
    {"name": "Transport", "type": CategoryType.expense, "icon": "transport", "color": "#4ECDC4"},
    {"name": "Shopping", "type": CategoryType.expense, "icon": "shopping", "color": "#45B7D1"},
    {"name": "Health", "type": CategoryType.expense, "icon": "health", "color": "#96CEB4"},
    {"name": "Entertainment", "type": CategoryType.expense, "icon": "fun", "color": "#FFEAA7"},
    {"name": "Bills & Utilities", "type": CategoryType.expense, "icon": "bills",
     "color": "#DDA0DD"},
    {"name": "Salary", "type": CategoryType.income, "icon": "salary", "color": "#98FB98"},
    {"name": "Freelance", "type": CategoryType.income, "icon": "freelance", "color": "#87CEEB"},
    {"name": "Investment", "type": CategoryType.income, "icon": "invest", "color": "#F0E68C"},
    {"name": "Transfer", "type": CategoryType.transfer, "icon": "transfer", "color": "#D3D3D3"},
]


async def seed() -> None:
    settings = get_settings()
    engine = create_async_engine(settings.database_url)
    async with AsyncSession(engine, expire_on_commit=False) as session:
        for data in _DEFAULT_CATEGORIES:
            session.add(Category(user_id=None, **data))
        await session.commit()
    await engine.dispose()
    print(f"Seeded {len(_DEFAULT_CATEGORIES)} default categories.")


if __name__ == "__main__":
    asyncio.run(seed())
