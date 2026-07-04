"""Unit tests: RequestLoggingMiddleware must log every request without masking errors."""

from __future__ import annotations

import pytest
import structlog.testing
from httpx import ASGITransport, AsyncClient
from starlette.applications import Starlette
from starlette.requests import Request
from starlette.responses import PlainTextResponse
from starlette.routing import Route

from app.core.middleware import RequestLoggingMiddleware


def _make_app() -> Starlette:
    async def ok(_request: Request) -> PlainTextResponse:
        return PlainTextResponse("ok")

    async def boom(_request: Request) -> PlainTextResponse:
        raise RuntimeError("boom")

    app = Starlette(routes=[Route("/ok", ok), Route("/boom", boom)])
    app.add_middleware(RequestLoggingMiddleware)
    return app


async def test_logs_status_for_successful_request() -> None:
    app = _make_app()
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        with structlog.testing.capture_logs() as logs:
            response = await ac.get("/ok")

    assert response.status_code == 200
    entry = next(log for log in logs if log["event"] == "request")
    assert entry["status"] == 200
    assert entry["method"] == "GET"
    assert entry["path"] == "/ok"


async def test_propagates_handler_exception_unmasked() -> None:
    """A handler crash must surface as the original exception, not UnboundLocalError."""
    app = _make_app()
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        with pytest.raises(RuntimeError, match="boom"):
            await ac.get("/boom")


async def test_logs_500_status_when_handler_raises() -> None:
    app = _make_app()
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        with structlog.testing.capture_logs() as logs:
            with pytest.raises(RuntimeError):
                await ac.get("/boom")

    entry = next(log for log in logs if log["event"] == "request")
    assert entry["status"] == 500
    assert entry["path"] == "/boom"
