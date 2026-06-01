"""Application error types and the FastAPI exception handler.

Domain and service code raises these errors instead of `HTTPException`. A single
handler translates any `AppError` into a consistent JSON response, which keeps
HTTP concerns out of the business logic.
"""

from __future__ import annotations

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse


class AppError(Exception):
    """Base class for expected, client-facing application errors."""

    status_code: int = 400

    def __init__(self, message: str) -> None:
        super().__init__(message)
        self.message = message


class BadRequestError(AppError):
    """The request is malformed or cannot be processed (HTTP 400)."""

    status_code = 400


class UnauthorizedError(AppError):
    """Authentication is missing or invalid (HTTP 401)."""

    status_code = 401


class ForbiddenError(AppError):
    """The caller may not access the requested resource (HTTP 403)."""

    status_code = 403


class NotFoundError(AppError):
    """The requested resource does not exist (HTTP 404)."""

    status_code = 404


class ConflictError(AppError):
    """The request conflicts with the current state of the resource (HTTP 409)."""

    status_code = 409


async def _app_error_handler(_request: Request, exc: Exception) -> JSONResponse:
    """Translate an `AppError` into a JSON error response."""
    # This handler is only registered for AppError; narrow for the type checker.
    if not isinstance(exc, AppError):
        raise exc
    return JSONResponse(
        status_code=exc.status_code,
        content={"message": exc.message, "data": None, "meta": None},
    )


def register_exception_handlers(app: FastAPI) -> None:
    """Register the application's exception handlers on the FastAPI app."""
    app.add_exception_handler(AppError, _app_error_handler)
