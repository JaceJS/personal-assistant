"""Async SQLAlchemy engine and session management."""

from __future__ import annotations

from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.core.config import get_settings

_settings = get_settings()

# A single engine per process. Connections are established lazily, so importing
# this module is safe even when the database is unreachable.
engine: AsyncEngine = create_async_engine(_settings.database_url, pool_pre_ping=True)

SessionFactory = async_sessionmaker(bind=engine, expire_on_commit=False, autoflush=False)


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency that yields a database session.

    The session is committed when the request succeeds and rolled back if it
    raises, so endpoint and service code never has to manage transactions.
    """
    async with SessionFactory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
