"""Guard: every table created by the migration chain must have RLS enabled.

The backend itself bypasses RLS (connects as the table owner), but on Supabase
the anon key can reach any un-protected table through PostgREST. This test runs
the full Alembic chain against a scratch database and fails if any table was
created without ``ENABLE ROW LEVEL SECURITY`` — so forgetting RLS in a new
migration breaks CI instead of silently exposing prod data.
"""

from __future__ import annotations

import asyncio
import os
import subprocess
import sys
import uuid
from pathlib import Path

import asyncpg
import pytest

from app.core.config import get_settings

BACKEND_DIR = Path(__file__).resolve().parents[2]

# Bookkeeping table managed by Alembic itself, never exposed nor user-scoped.
RLS_EXEMPT_TABLES = {"alembic_version"}


def _split_url(async_url: str) -> tuple[str, str]:
    """Return (asyncpg DSN without database, database name)."""
    dsn = async_url.replace("postgresql+asyncpg://", "postgresql://")
    base, _, dbname = dsn.rpartition("/")
    return base, dbname


async def _create_scratch_db(server_dsn: str, dbname: str) -> None:
    conn = await asyncpg.connect(f"{server_dsn}/postgres")
    try:
        await conn.execute(f'CREATE DATABASE "{dbname}"')
    finally:
        await conn.close()


async def _drop_scratch_db(server_dsn: str, dbname: str) -> None:
    conn = await asyncpg.connect(f"{server_dsn}/postgres")
    try:
        await conn.execute(f'DROP DATABASE IF EXISTS "{dbname}" WITH (FORCE)')
    finally:
        await conn.close()


async def _tables_without_rls(server_dsn: str, dbname: str) -> list[str]:
    conn = await asyncpg.connect(f"{server_dsn}/{dbname}")
    try:
        rows = await conn.fetch(
            """
            SELECT c.relname
            FROM pg_class c
            JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE n.nspname = 'public' AND c.relkind = 'r'
              AND NOT c.relrowsecurity
            ORDER BY c.relname
            """
        )
        return [r["relname"] for r in rows if r["relname"] not in RLS_EXEMPT_TABLES]
    finally:
        await conn.close()


@pytest.mark.integration
def test_every_migrated_table_has_rls_enabled() -> None:
    server_dsn, _ = _split_url(get_settings().test_database_url)
    scratch = f"rls_guard_{uuid.uuid4().hex[:8]}"

    asyncio.run(_create_scratch_db(server_dsn, scratch))
    try:
        result = subprocess.run(
            [sys.executable, "-m", "alembic", "upgrade", "head"],
            cwd=BACKEND_DIR,
            env={
                **os.environ,
                "DATABASE_URL": f"{server_dsn.replace('postgresql://', 'postgresql+asyncpg://')}/{scratch}",
            },
            capture_output=True,
            text=True,
            timeout=120,
        )
        assert result.returncode == 0, f"alembic upgrade head failed:\n{result.stderr}"

        missing = asyncio.run(_tables_without_rls(server_dsn, scratch))
        assert not missing, (
            f"Tables without RLS after full migration chain: {missing}. "
            "Add `ALTER TABLE <name> ENABLE ROW LEVEL SECURITY` to the migration "
            "that creates them (see 0013_enable_rls_new_tables.py for the pattern)."
        )
    finally:
        asyncio.run(_drop_scratch_db(server_dsn, scratch))
