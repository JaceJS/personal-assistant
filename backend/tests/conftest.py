"""Shared pytest fixtures."""

from __future__ import annotations

import uuid
from collections.abc import AsyncGenerator

import pytest
import pytest_asyncio
import sqlalchemy as sa
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, create_async_engine

from app.core.auth import get_current_user
from app.core.config import get_settings
from app.core.database import get_session
from app.main import app
from app.shared.models import Base

_settings = get_settings()

# Enum DDL needed before create_all because models use create_type=False.
_ENUM_DDL = [
    "CREATE TYPE IF NOT EXISTS account_type AS ENUM ('cash','bank','ewallet','credit')",
    "CREATE TYPE IF NOT EXISTS category_type AS ENUM ('expense','income','transfer')",
    "CREATE TYPE IF NOT EXISTS transaction_source AS ENUM ('voice','manual','import')",
    "CREATE TYPE IF NOT EXISTS transaction_status AS ENUM ('draft','confirmed')",
    "CREATE TYPE IF NOT EXISTS voice_processing_status "
    "AS ENUM ('pending','transcribing','extracting','completed','failed')",
]
_ENUM_DROP = [
    "DROP TYPE IF EXISTS voice_processing_status",
    "DROP TYPE IF EXISTS transaction_status",
    "DROP TYPE IF EXISTS transaction_source",
    "DROP TYPE IF EXISTS category_type",
    "DROP TYPE IF EXISTS account_type",
]


@pytest_asyncio.fixture(scope="session")
async def db_engine() -> AsyncGenerator[AsyncEngine, None]:
    """Create test DB tables once per session; drop them after."""
    engine = create_async_engine(_settings.test_database_url)
    async with engine.begin() as conn:
        for ddl in _ENUM_DDL:
            await conn.execute(sa.text(ddl))
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        for ddl in _ENUM_DROP:
            await conn.execute(sa.text(ddl))
    await engine.dispose()


@pytest.fixture
def test_user_id() -> uuid.UUID:
    return uuid.uuid4()


@pytest_asyncio.fixture
async def db_session(db_engine: AsyncEngine) -> AsyncGenerator[AsyncSession, None]:
    """Direct DB session for seeding data and asserting state in tests."""
    async with AsyncSession(db_engine, expire_on_commit=False) as session:
        yield session


@pytest_asyncio.fixture
async def client(
    db_engine: AsyncEngine, test_user_id: uuid.UUID
) -> AsyncGenerator[AsyncClient, None]:
    """Authenticated ASGI test client backed by the test database."""

    async def _get_session() -> AsyncGenerator[AsyncSession, None]:
        async with AsyncSession(db_engine, expire_on_commit=False) as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise

    def _get_current_user() -> uuid.UUID:
        return test_user_id

    app.dependency_overrides[get_session] = _get_session
    app.dependency_overrides[get_current_user] = _get_current_user

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()
