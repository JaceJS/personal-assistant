"""Integration tests: account list endpoint's updated_since sync filter."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.finance import repository as repo
from app.domains.finance.models import AccountType

pytestmark = pytest.mark.integration


async def test_list_accounts_with_updated_since_returns_only_changed_rows(
    client: AsyncClient,
    db_session: AsyncSession,
    test_user_id: uuid.UUID,
) -> None:
    old_account = await repo.create_account(
        db_session, test_user_id, name="Old", type=AccountType.cash, currency="IDR"
    )
    cutoff = datetime.now(UTC)
    new_account = await repo.create_account(
        db_session, test_user_id, name="New", type=AccountType.cash, currency="IDR"
    )
    await repo.update_account(db_session, old_account, updated_at=cutoff - timedelta(days=1))
    await repo.update_account(db_session, new_account, updated_at=cutoff + timedelta(seconds=1))
    await db_session.commit()

    response = await client.get(
        "/api/v1/accounts", params={"updated_since": cutoff.isoformat()}
    )

    assert response.status_code == 200
    ids = {item["id"] for item in response.json()["data"]}
    assert ids == {str(new_account.id)}


async def test_list_accounts_with_updated_since_includes_recently_archived_rows(
    client: AsyncClient,
    db_session: AsyncSession,
    test_user_id: uuid.UUID,
) -> None:
    """A delta pull must surface an archive too, or a client's local mirror
    never learns the account was archived elsewhere."""
    cutoff = datetime.now(UTC)
    account = await repo.create_account(
        db_session, test_user_id, name="To archive", type=AccountType.cash, currency="IDR"
    )
    await repo.update_account(
        db_session, account, is_archived=True, updated_at=cutoff + timedelta(seconds=1)
    )
    await db_session.commit()

    response = await client.get(
        "/api/v1/accounts", params={"updated_since": cutoff.isoformat()}
    )

    assert response.status_code == 200
    ids = {item["id"] for item in response.json()["data"]}
    assert ids == {str(account.id)}


async def test_list_accounts_without_updated_since_still_excludes_archived(
    client: AsyncClient,
    db_session: AsyncSession,
    test_user_id: uuid.UUID,
) -> None:
    account = await repo.create_account(
        db_session, test_user_id, name="Archived", type=AccountType.cash, currency="IDR"
    )
    await repo.update_account(db_session, account, is_archived=True)
    await db_session.commit()

    response = await client.get("/api/v1/accounts")

    assert response.status_code == 200
    assert response.json()["data"] == []
