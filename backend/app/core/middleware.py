from __future__ import annotations

import time
import uuid

import structlog
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

_logger = structlog.get_logger(__name__)


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: object) -> Response:
        request_id = str(uuid.uuid4())
        structlog.contextvars.bind_contextvars(request_id=request_id)
        start = time.perf_counter()
        try:
            response: Response = await call_next(request)  # type: ignore[operator]
        finally:
            duration_ms = round((time.perf_counter() - start) * 1000, 1)
            _logger.info(
                "request",
                method=request.method,
                path=request.url.path,
                status=response.status_code,
                duration_ms=duration_ms,
            )
            structlog.contextvars.clear_contextvars()
        return response
