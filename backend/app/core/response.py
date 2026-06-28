"""Standard API response envelope for all endpoints."""

from __future__ import annotations

from typing import Generic, TypeVar

from pydantic import BaseModel

T = TypeVar("T")


class Meta(BaseModel):
    total: int
    limit: int
    offset: int


class ApiResponse(BaseModel, Generic[T]):  # noqa: UP046
    message: str
    data: T | None
    meta: Meta | None = None


def ok(data: T, message: str = "success") -> ApiResponse[T]:  # noqa: UP047
    """Wrap a single item in the standard response envelope."""
    return ApiResponse(message=message, data=data, meta=None)


def paginated(  # noqa: UP047
    items: list[T],
    *,
    total: int,
    limit: int,
    offset: int,
) -> ApiResponse[list[T]]:
    """Wrap a paginated list in the standard response envelope."""
    return ApiResponse(
        message="success",
        data=items,
        meta=Meta(total=total, limit=limit, offset=offset),
    )
