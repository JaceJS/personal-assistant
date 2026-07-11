from __future__ import annotations

import time
import uuid

import structlog
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

from app.core.config import get_settings
from app.core.request_utils import get_client_ip

_logger = structlog.get_logger(__name__)
_settings = get_settings()


class MaxBodySizeMiddleware(BaseHTTPMiddleware):
    """Reject requests whose declared Content-Length exceeds `max_bytes`.

    Checked against the header only, before Starlette reads/buffers the body
    (e.g. to a temp file for multipart uploads) — the actual per-field caps
    in `read_and_validate_upload` still apply for requests without a
    Content-Length header (chunked/streamed).
    """

    def __init__(self, app: object, *, max_bytes: int) -> None:
        super().__init__(app)  # type: ignore[arg-type]
        self._max_bytes = max_bytes

    async def dispatch(self, request: Request, call_next: object) -> Response:
        content_length = request.headers.get("content-length")
        if content_length is not None:
            try:
                declared_bytes = int(content_length)
            except ValueError:
                declared_bytes = None
            if declared_bytes is not None and declared_bytes > self._max_bytes:
                return JSONResponse(
                    status_code=413,
                    content={"message": "Request body too large", "data": None, "meta": None},
                )
        return await call_next(request)  # type: ignore[operator,no-any-return]


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: object) -> Response:
        request_id = str(uuid.uuid4())
        client_ip = get_client_ip(request, _settings.trusted_proxy_list)
        structlog.contextvars.bind_contextvars(request_id=request_id, client_ip=client_ip)
        start = time.perf_counter()
        # If call_next raises, log 500 and let the exception propagate to the
        # exception handlers; referencing `response` here would mask it.
        status = 500
        try:
            response: Response = await call_next(request)  # type: ignore[operator]
            status = response.status_code
        finally:
            duration_ms = round((time.perf_counter() - start) * 1000, 1)
            _logger.info(
                "request",
                method=request.method,
                path=request.url.path,
                status=status,
                duration_ms=duration_ms,
            )
            structlog.contextvars.clear_contextvars()
        return response
