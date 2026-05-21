"""Supabase JWT authentication.

Supabase Auth owns the users table; this backend only verifies the access token
it issues and extracts the user id. Tokens are signed with HS256 using the
project's JWT secret.
"""

from __future__ import annotations

import uuid
from typing import Annotated

import jwt
from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.config import get_settings
from app.core.exceptions import UnauthorizedError

# Supabase signs access tokens with HS256 and sets this audience claim.
_JWT_ALGORITHM = "HS256"
_JWT_AUDIENCE = "authenticated"

_bearer_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer_scheme)],
) -> uuid.UUID:
    """Verify the Supabase JWT and return the authenticated user's id.

    Raises `UnauthorizedError` (HTTP 401) when the token is missing, malformed,
    expired, or otherwise invalid.
    """
    if credentials is None:
        raise UnauthorizedError("Missing bearer token")

    settings = get_settings()
    try:
        payload = jwt.decode(
            credentials.credentials,
            settings.supabase_jwt_secret,
            algorithms=[_JWT_ALGORITHM],
            audience=_JWT_AUDIENCE,
        )
    except jwt.PyJWTError as exc:
        raise UnauthorizedError("Invalid or expired token") from exc

    subject = payload.get("sub")
    if not subject:
        raise UnauthorizedError("Token is missing the subject claim")
    try:
        return uuid.UUID(str(subject))
    except ValueError as exc:
        raise UnauthorizedError("Token subject is not a valid user id") from exc


# Reusable dependency annotation for route handlers.
CurrentUser = Annotated[uuid.UUID, Depends(get_current_user)]
