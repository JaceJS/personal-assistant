"""Unit tests: MaxBodySizeMiddleware rejects oversized requests by Content-Length
before the body is read, so a client can't force the server to buffer an
arbitrarily large multipart upload to disk before per-field size checks run.
"""

from __future__ import annotations

from httpx import ASGITransport, AsyncClient
from starlette.applications import Starlette
from starlette.requests import Request
from starlette.responses import PlainTextResponse
from starlette.routing import Route

from app.core.middleware import MaxBodySizeMiddleware

_MAX_BYTES = 30 * 1024 * 1024


def _make_app() -> Starlette:
    async def ok(_request: Request) -> PlainTextResponse:
        return PlainTextResponse("ok")

    app = Starlette(routes=[Route("/ok", ok, methods=["POST"])])
    app.add_middleware(MaxBodySizeMiddleware, max_bytes=_MAX_BYTES)
    return app


async def test_rejects_request_over_content_length_cap() -> None:
    app = _make_app()
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post(
            "/ok", content=b"x", headers={"Content-Length": str(_MAX_BYTES + 1)}
        )
    assert response.status_code == 413


async def test_allows_request_within_content_length_cap() -> None:
    app = _make_app()
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post("/ok", content=b"hello")
    assert response.status_code == 200


async def test_allows_request_with_no_content_length_header() -> None:
    """Chunked/streamed requests without Content-Length pass through; the
    per-endpoint byte-cap in read_and_validate_upload still applies."""

    async def _stream() -> bytes:
        yield b"hello"

    app = _make_app()
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post("/ok", content=_stream())
    assert response.status_code == 200
