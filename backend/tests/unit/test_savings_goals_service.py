"""Unit tests for savings goals service logic (no DB/Redis needed)."""

from __future__ import annotations

import uuid
from datetime import UTC, date, datetime
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.core.exceptions import BadRequestError, ForbiddenError, NotFoundError
from app.domains.finance import service as finance_service
from app.domains.finance.models import SavingsGoal
from app.domains.finance.schemas import (
    SavingsGoalContribute,
    SavingsGoalCreate,
)

_USER_ID = uuid.uuid4()
_OTHER_USER_ID = uuid.uuid4()
_GOAL_ID = uuid.uuid4()


def _make_session() -> AsyncMock:
    return AsyncMock()


def _make_goal(
    *,
    user_id: uuid.UUID = _USER_ID,
    name: str = "DP Motor",
    target_amount: int = 5_000_000,
    current_amount: int = 0,
    target_date: date | None = None,
    icon: str | None = "🏍️",
    is_archived: bool = False,
) -> SavingsGoal:
    goal = MagicMock(spec=SavingsGoal)
    goal.id = _GOAL_ID
    goal.user_id = user_id
    goal.name = name
    goal.target_amount = target_amount
    goal.current_amount = current_amount
    goal.target_date = target_date
    goal.icon = icon
    goal.is_archived = is_archived
    goal.created_at = datetime.now(UTC)
    goal.updated_at = datetime.now(UTC)
    return goal


# ── list_savings_goals ────────────────────────────────────────────────────────


async def test_list_savings_goals_returns_only_active() -> None:
    session = _make_session()
    goals = [_make_goal(), _make_goal(name="Liburan Bali")]

    with patch("app.domains.finance.service.repo") as mock_repo:
        mock_repo.list_savings_goals = AsyncMock(return_value=goals)
        result = await finance_service.list_savings_goals(session, _USER_ID)

    assert result == goals
    mock_repo.list_savings_goals.assert_called_once_with(session, _USER_ID)


# ── get_savings_goal ──────────────────────────────────────────────────────────


async def test_get_savings_goal_raises_not_found_when_missing() -> None:
    session = _make_session()

    with patch("app.domains.finance.service.repo") as mock_repo:
        mock_repo.get_savings_goal = AsyncMock(return_value=None)

        with pytest.raises(NotFoundError):
            await finance_service.get_savings_goal(session, _GOAL_ID, _USER_ID)


async def test_get_savings_goal_raises_forbidden_for_wrong_owner() -> None:
    session = _make_session()
    goal = _make_goal(user_id=_OTHER_USER_ID)

    with patch("app.domains.finance.service.repo") as mock_repo:
        mock_repo.get_savings_goal = AsyncMock(return_value=goal)

        with pytest.raises(ForbiddenError):
            await finance_service.get_savings_goal(session, _GOAL_ID, _USER_ID)


async def test_get_savings_goal_returns_goal_for_correct_owner() -> None:
    session = _make_session()
    goal = _make_goal()

    with patch("app.domains.finance.service.repo") as mock_repo:
        mock_repo.get_savings_goal = AsyncMock(return_value=goal)
        result = await finance_service.get_savings_goal(session, _GOAL_ID, _USER_ID)

    assert result is goal


# ── create_savings_goal ───────────────────────────────────────────────────────


async def test_create_savings_goal_requires_positive_target() -> None:
    session = _make_session()
    data = SavingsGoalCreate(name="DP Motor", target_amount=0)

    with pytest.raises(BadRequestError, match="target_amount"):
        await finance_service.create_savings_goal(session, _USER_ID, data)


async def test_create_savings_goal_success() -> None:
    session = _make_session()
    data = SavingsGoalCreate(name="DP Motor", target_amount=5_000_000)
    goal = _make_goal()

    with patch("app.domains.finance.service.repo") as mock_repo:
        mock_repo.create_savings_goal = AsyncMock(return_value=goal)
        result = await finance_service.create_savings_goal(session, _USER_ID, data)

    assert result is goal
    mock_repo.create_savings_goal.assert_called_once()


# ── contribute_to_savings_goal ────────────────────────────────────────────────


async def test_contribute_increases_current_amount() -> None:
    session = _make_session()
    goal = _make_goal(current_amount=1_000_000, target_amount=5_000_000)
    contribute = SavingsGoalContribute(amount=500_000)

    with patch("app.domains.finance.service.repo") as mock_repo:
        mock_repo.get_savings_goal = AsyncMock(return_value=goal)
        mock_repo.update_savings_goal = AsyncMock(return_value=goal)

        await finance_service.contribute_to_savings_goal(session, _GOAL_ID, _USER_ID, contribute)

    mock_repo.update_savings_goal.assert_called_once()
    call_kwargs = mock_repo.update_savings_goal.call_args[1]
    assert call_kwargs["current_amount"] == 1_500_000


async def test_contribute_clamps_current_amount_to_zero_on_withdrawal() -> None:
    session = _make_session()
    goal = _make_goal(current_amount=200_000, target_amount=5_000_000)
    contribute = SavingsGoalContribute(amount=-999_999)

    with patch("app.domains.finance.service.repo") as mock_repo:
        mock_repo.get_savings_goal = AsyncMock(return_value=goal)
        mock_repo.update_savings_goal = AsyncMock(return_value=goal)

        await finance_service.contribute_to_savings_goal(session, _GOAL_ID, _USER_ID, contribute)

    call_kwargs = mock_repo.update_savings_goal.call_args[1]
    assert call_kwargs["current_amount"] == 0


async def test_contribute_does_not_exceed_target_amount() -> None:
    session = _make_session()
    goal = _make_goal(current_amount=4_800_000, target_amount=5_000_000)
    contribute = SavingsGoalContribute(amount=999_999)

    with patch("app.domains.finance.service.repo") as mock_repo:
        mock_repo.get_savings_goal = AsyncMock(return_value=goal)
        mock_repo.update_savings_goal = AsyncMock(return_value=goal)

        await finance_service.contribute_to_savings_goal(session, _GOAL_ID, _USER_ID, contribute)

    call_kwargs = mock_repo.update_savings_goal.call_args[1]
    assert call_kwargs["current_amount"] == 5_000_000


async def test_contribute_raises_forbidden_for_wrong_owner() -> None:
    session = _make_session()
    goal = _make_goal(user_id=_OTHER_USER_ID)
    contribute = SavingsGoalContribute(amount=100_000)

    with patch("app.domains.finance.service.repo") as mock_repo:
        mock_repo.get_savings_goal = AsyncMock(return_value=goal)

        with pytest.raises(ForbiddenError):
            await finance_service.contribute_to_savings_goal(
                session, _GOAL_ID, _USER_ID, contribute
            )


async def test_contribute_raises_bad_request_for_zero_amount() -> None:
    from pydantic import ValidationError

    with pytest.raises(ValidationError):
        SavingsGoalContribute(amount=0)


# ── delete_savings_goal (soft) ────────────────────────────────────────────────


async def test_delete_savings_goal_archives_not_deletes() -> None:
    session = _make_session()
    goal = _make_goal()

    with patch("app.domains.finance.service.repo") as mock_repo:
        mock_repo.get_savings_goal = AsyncMock(return_value=goal)
        mock_repo.update_savings_goal = AsyncMock(return_value=goal)

        await finance_service.delete_savings_goal(session, _GOAL_ID, _USER_ID)

    call_kwargs = mock_repo.update_savings_goal.call_args[1]
    assert call_kwargs["is_archived"] is True
