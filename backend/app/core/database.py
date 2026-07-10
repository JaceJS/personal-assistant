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
#
# statement_cache_size=0 disables asyncpg's client-side prepared statement cache.
# Required when DATABASE_URL points at a PgBouncer pool in transaction mode (e.g.
# Supabase's pooler on port 6543): each "connection" the app sees can be routed to
# a different backend connection between statements, so a cached prepared
# statement name can collide with one already bound there, raising
# DuplicatePreparedStatementError under concurrent load.
engine: AsyncEngine = create_async_engine(
    _settings.database_url,
    pool_pre_ping=True,
    connect_args={"statement_cache_size": 0},
)

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
