"""Integration tests: savings goals list endpoint's updated_since sync filter."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.finance import repository as repo

pytestmark = pytest.mark.integration


async def test_list_savings_goals_with_updated_since_includes_recently_archived(
    client: AsyncClient,
    db_session: AsyncSession,
    test_user_id: uuid.UUID,
) -> None:
    cutoff = datetime.now(UTC)
    old_goal = await repo.create_savings_goal(
        db_session, test_user_id, name="Old", target_amount=1_000_000, current_amount=0
    )
    goal = await repo.create_savings_goal(
        db_session, test_user_id, name="Archived later", target_amount=2_000_000, current_amount=0
    )
    await repo.update_savings_goal(db_session, old_goal, updated_at=cutoff - timedelta(days=1))
    await repo.update_savings_goal(
        db_session, goal, is_archived=True, updated_at=cutoff + timedelta(seconds=1)
    )
    await db_session.commit()

    response = await client.get(
        "/api/v1/savings-goals", params={"updated_since": cutoff.isoformat()}
    )

    assert response.status_code == 200
    ids = {item["id"] for item in response.json()["data"]}
    assert ids == {str(goal.id)}


async def test_list_savings_goals_without_updated_since_still_excludes_archived(
    client: AsyncClient,
    db_session: AsyncSession,
    test_user_id: uuid.UUID,
) -> None:
    goal = await repo.create_savings_goal(
        db_session, test_user_id, name="Archived", target_amount=1_000_000, current_amount=0
    )
    await repo.update_savings_goal(db_session, goal, is_archived=True)
    await db_session.commit()

    response = await client.get("/api/v1/savings-goals")

    assert response.status_code == 200
    assert response.json()["data"] == []
