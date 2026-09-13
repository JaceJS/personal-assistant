"""Unit tests for category creation service logic (no DB needed)."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.core.exceptions import ConflictError
from app.domains.finance import service as finance_service
from app.domains.finance.models import Category, CategoryType
from app.domains.finance.schemas import CategoryCreate

_USER_ID = uuid.uuid4()
_OTHER_USER_ID = uuid.uuid4()
_CATEGORY_ID = uuid.uuid4()


def _make_session() -> AsyncMock:
    return AsyncMock()


def _make_category(
    *,
    user_id: uuid.UUID | None = _USER_ID,
    name: str = "Makan",
    category_type: CategoryType = CategoryType.expense,
) -> Category:
    category = MagicMock(spec=Category)
    category.id = _CATEGORY_ID
    category.user_id = user_id
    category.name = name
    category.type = category_type
    category.icon = None
    category.color = None
    category.is_archived = False
    category.created_at = datetime.now(UTC)
    category.updated_at = datetime.now(UTC)
    return category


# ── create_category (client-supplied id, offline-first sync) ───────────────────


async def test_create_category_without_id_lets_db_generate_one() -> None:
    session = _make_session()
    data = CategoryCreate(name="Makan", type=CategoryType.expense)

    with patch("app.domains.finance.service.repo") as mock_repo:
        mock_repo.get_category = AsyncMock(return_value=None)
        mock_repo.create_category = AsyncMock(return_value=_make_category())

        await finance_service.create_category(session, _USER_ID, data)

    mock_repo.get_category.assert_not_called()
    _, kwargs = mock_repo.create_category.call_args
    assert "id" not in kwargs


async def test_create_category_with_client_id_passes_it_through() -> None:
    session = _make_session()
    client_id = uuid.uuid4()
    data = CategoryCreate(id=client_id, name="Makan", type=CategoryType.expense)

    with patch("app.domains.finance.service.repo") as mock_repo:
        mock_repo.get_category = AsyncMock(return_value=None)
        mock_repo.create_category = AsyncMock(return_value=_make_category())
        mock_repo.get_user_category_budget = AsyncMock(return_value=None)

        await finance_service.create_category(session, _USER_ID, data)

    _, kwargs = mock_repo.create_category.call_args
    assert kwargs["id"] == client_id


async def test_create_category_retry_with_same_id_is_idempotent() -> None:
    session = _make_session()
    client_id = uuid.uuid4()
    existing = _make_category()
    data = CategoryCreate(id=client_id, name="Makan", type=CategoryType.expense)

    with patch("app.domains.finance.service.repo") as mock_repo:
        mock_repo.get_category = AsyncMock(return_value=existing)
        mock_repo.get_user_category_budget = AsyncMock(return_value=None)
        mock_repo.create_category = AsyncMock()

        result = await finance_service.create_category(session, _USER_ID, data)

    assert result.id == existing.id
    mock_repo.create_category.assert_not_called()


async def test_create_category_id_owned_by_another_user_raises_conflict() -> None:
    session = _make_session()
    client_id = uuid.uuid4()
    other_users_category = _make_category(user_id=_OTHER_USER_ID)
    data = CategoryCreate(id=client_id, name="Makan", type=CategoryType.expense)

    with patch("app.domains.finance.service.repo") as mock_repo:
        mock_repo.get_category = AsyncMock(return_value=other_users_category)

        with pytest.raises(ConflictError):
            await finance_service.create_category(session, _USER_ID, data)
