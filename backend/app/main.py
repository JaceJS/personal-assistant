"""FastAPI application entry point."""

from __future__ import annotations

import asyncio
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

import structlog
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.core.database import engine
from app.core.exceptions import register_exception_handlers
from app.core.logging import configure_logging
from app.core.middleware import RequestLoggingMiddleware
from app.domains.finance.router import router as finance_router
from app.shared.queue import create_redis_pool

_settings = get_settings()


_lifespan_logger = structlog.get_logger("startup")


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncGenerator[None, None]:
    configure_logging()
    _app.state.redis = await create_redis_pool(_settings)
    await _check_jwks()
    yield
    await _app.state.redis.aclose()
    await engine.dispose()


async def _check_jwks() -> None:
    from app.core.auth import _jwks_client

    try:
        await asyncio.to_thread(_jwks_client.fetch_data)
        _lifespan_logger.info("jwks_ok")
    except Exception as exc:
        _lifespan_logger.error("jwks_startup_failed", error_type=type(exc).__name__, detail=str(exc))


app = FastAPI(
    title="Personal Assistant API",
    version="0.1.0",
    docs_url="/docs" if not _settings.is_production else None,
    redoc_url=None,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(RequestLoggingMiddleware)

register_exception_handlers(app)

app.include_router(finance_router)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
