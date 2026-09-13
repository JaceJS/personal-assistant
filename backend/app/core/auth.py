"""Supabase JWT authentication.

Supabase Auth owns the users table; this backend only verifies the access token
it issues and extracts the user id. Tokens are signed with ES256/RS256 (JWKS);
keys are fetched from Supabase's JWKS endpoint and cached for the process lifetime.
"""

from __future__ import annotations

import asyncio
import uuid
from typing import Annotated, Any

import jwt
import structlog
from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt import PyJWKClient, PyJWKClientConnectionError

from app.core.config import get_settings
from app.core.exceptions import UnauthorizedError

_JWT_AUDIENCE = "authenticated"

_bearer_scheme = HTTPBearer(auto_error=False)
_logger = structlog.get_logger(__name__)

# Cached per process; PyJWKClient handles key rotation internally.
_jwks_client = PyJWKClient(f"{get_settings().supabase_url}/auth/v1/.well-known/jwks.json")


async def _verify_supabase_jwt(token: str) -> dict[str, Any]:
    """Verify a Supabase-issued access token and return its decoded payload.

    Shared by every auth dependency (regular user, admin, ...) so token
    verification has exactly one implementation. Raises `UnauthorizedError`
    (HTTP 401) when the token is missing, malformed, expired, or otherwise
    invalid.
    """
    settings = get_settings()
    try:
        # Run the blocking urllib JWKS fetch in a thread to avoid blocking the event loop.
        signing_key = await asyncio.to_thread(_jwks_client.get_signing_key_from_jwt, token)
        return jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256", "ES256"],
            audience=_JWT_AUDIENCE,
            issuer=f"{settings.supabase_url}/auth/v1",
            options={"require": ["exp", "sub", "iss"]},
        )
    except PyJWKClientConnectionError as exc:
        _logger.error(
            "jwks_fetch_failed",
            jwks_url=f"{get_settings().supabase_url}/auth/v1/.well-known/jwks.json",
            error_type=type(exc).__name__,
            detail=str(exc),
        )
        raise UnauthorizedError("Auth service unavailable") from exc
    except jwt.PyJWTError as exc:
        _logger.warning("jwt_validation_failed", error_type=type(exc).__name__, detail=str(exc))
        detail = (
            f"Invalid or expired token [{type(exc).__name__}]"
            if not settings.is_production
            else "Invalid or expired token"
        )
        raise UnauthorizedError(detail) from exc


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer_scheme)],
) -> uuid.UUID:
    """Verify the Supabase JWT and return the authenticated user's id.

    Raises `UnauthorizedError` (HTTP 401) when the token is missing, malformed,
    expired, or otherwise invalid.
    """
    if credentials is None:
        raise UnauthorizedError("Missing bearer token")

    payload = await _verify_supabase_jwt(credentials.credentials)

    subject = payload.get("sub")
    if not subject:
        raise UnauthorizedError("Token is missing the subject claim")
    try:
        return uuid.UUID(str(subject))
    except ValueError as exc:
        raise UnauthorizedError("Token subject is not a valid user id") from exc


# Reusable dependency annotation for route handlers.
CurrentUser = Annotated[uuid.UUID, Depends(get_current_user)]
