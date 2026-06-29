"""FastAPI application entry point."""

from __future__ import annotations

import asyncio
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

import structlog
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.utils import get_openapi

from app.core.config import get_settings
from app.core.database import engine
from app.core.exceptions import register_exception_handlers
from app.core.logging import configure_logging
from app.core.middleware import RequestLoggingMiddleware
from app.domains.ai.router import router as ai_router
from app.domains.finance.router import router as finance_router
from app.domains.sync.router import router as sync_router
from app.domains.users.router import router as users_router
from app.shared.queue import create_redis_pool

_settings = get_settings()

_lifespan_logger = structlog.get_logger("startup")

_openapi_tags = [
    {"name": "Budget", "description": "Monthly budget settings per user."},
    {"name": "Accounts", "description": "Bank/wallet accounts and balances."},
    {"name": "Categories", "description": "Transaction categories (system + user-defined)."},
    {"name": "Transactions", "description": "Income and expense transactions."},
    {"name": "Voice", "description": "Voice-to-transaction upload and status polling."},
    {"name": "Receipt", "description": "Receipt image scanning and transaction extraction."},
    {"name": "AI", "description": "AI assistant chat."},
    {"name": "Account", "description": "User account management (permanent deletion)."},
]


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
        _lifespan_logger.error(
            "jwks_startup_failed", error_type=type(exc).__name__, detail=str(exc)
        )


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
app.include_router(ai_router, prefix="/api/v1")
app.include_router(sync_router, prefix="/api/v1")
app.include_router(users_router, prefix="/api/v1")


def _custom_openapi() -> dict[str, object]:
    if app.openapi_schema:
        return app.openapi_schema
    schema = get_openapi(
        title=app.title,
        version=app.version,
        description=(
            "## Authentication\n\n"
            "All endpoints require a Supabase JWT.\n\n"
            "**Get a token (dev/testing):**\n"
            "```\n"
            "POST {SUPABASE_URL}/auth/v1/token?grant_type=password\n"
            "Content-Type: application/json\n\n"
            '{"email": "you@example.com", "password": "yourpassword"}\n'
            "```\n"
            "Copy `access_token` and paste it into the **Authorize** button above."
        ),
        routes=app.routes,
        tags=_openapi_tags,
    )
    schema.setdefault("components", {}).setdefault("securitySchemes", {})
    schema["components"]["securitySchemes"]["BearerAuth"] = {
        "type": "http",
        "scheme": "bearer",
        "bearerFormat": "JWT",
        "description": "Supabase JWT. Obtain via POST /auth/v1/token?grant_type=password",
    }
    schema["security"] = [{"BearerAuth": []}]
    app.openapi_schema = schema
    return schema


app.openapi = _custom_openapi  # type: ignore[method-assign]


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
