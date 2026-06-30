"""Application error types and the FastAPI exception handler.

Domain and service code raises these errors instead of `HTTPException`. A single
handler translates any `AppError` into a consistent JSON response, which keeps
HTTP concerns out of the business logic.
"""

from __future__ import annotations

import structlog
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

_logger = structlog.get_logger(__name__)


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


class TooManyRequestsError(AppError):
    """The caller has exceeded the allowed request rate (HTTP 429)."""

    status_code = 429


async def _app_error_handler(_request: Request, exc: Exception) -> JSONResponse:
    """Translate an `AppError` into a JSON error response."""
    if not isinstance(exc, AppError):
        raise exc
    log = _logger.warning if exc.status_code < 500 else _logger.error
    log(
        "app_error",
        error_type=type(exc).__name__,
        status=exc.status_code,
        path=_request.url.path,
    )
    return JSONResponse(
        status_code=exc.status_code,
        content={"message": exc.message, "data": None, "meta": None},
    )


async def _unhandled_error_handler(_request: Request, exc: Exception) -> JSONResponse:
    _logger.error(
        "unhandled_exception",
        error_type=type(exc).__name__,
        path=_request.url.path,
        exc_info=True,
    )
    return JSONResponse(
        status_code=500,
        content={"message": "Internal server error", "data": None, "meta": None},
    )


def register_exception_handlers(app: FastAPI) -> None:
    """Register the application's exception handlers on the FastAPI app."""
    app.add_exception_handler(AppError, _app_error_handler)
    app.add_exception_handler(Exception, _unhandled_error_handler)
