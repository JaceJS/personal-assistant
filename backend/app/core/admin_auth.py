"""Admin-only authorization, layered on top of the same Supabase JWT
verification as CurrentUser (see app/core/auth.py).

A valid token alone is not enough here: the token's email claim must also be
on ADMIN_ALLOWLIST. This is deliberately not a roles table — an env-var
allowlist matches this app's scale (1-2 admins) and its existing all-env-var
config convention, without adding new schema for something this small.
"""

from __future__ import annotations

from typing import Annotated

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.auth import _verify_supabase_jwt
from app.core.config import get_settings
from app.core.exceptions import ForbiddenError, UnauthorizedError

_bearer_scheme = HTTPBearer(auto_error=False)


async def get_admin_email(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer_scheme)],
) -> str:
    """Verify the Supabase JWT and require its email to be admin-allowlisted.

    Returns the verified admin's email (lowercased). Raises `UnauthorizedError`
    (401) for a missing/invalid token, `ForbiddenError` (403) for a valid
    token whose email is missing or not allowlisted — a real user hitting an
    admin route should see "forbidden", not learn anything about why.
    """
    if credentials is None:
        raise UnauthorizedError("Missing bearer token")

    payload = await _verify_supabase_jwt(credentials.credentials)

    email = payload.get("email")
    if not email or str(email).lower() not in get_settings().admin_allowlist_set:
        raise ForbiddenError("Not an admin")
    return str(email).lower()


# Reusable dependency annotation for admin-only route handlers.
AdminUser = Annotated[str, Depends(get_admin_email)]
