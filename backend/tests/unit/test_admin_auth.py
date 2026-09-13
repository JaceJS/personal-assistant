"""Unit tests for get_admin_email (admin-only authorization on top of the
same Supabase JWT verification as get_current_user)."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta
from unittest.mock import MagicMock, patch

import jwt
import pytest
from fastapi.security import HTTPAuthorizationCredentials

from app.core.admin_auth import get_admin_email
from app.core.auth import _JWT_AUDIENCE
from app.core.exceptions import ForbiddenError, UnauthorizedError

_SECRET = "test-signing-secret"
_ISSUER = "https://example.supabase.co/auth/v1"
_real_jwt_decode = jwt.decode


def _make_signing_key() -> MagicMock:
    key = MagicMock()
    key.key = _SECRET
    return key


def _make_token(*, email: str | None, sub: str | None = None) -> str:
    payload: dict[str, object] = {
        "exp": datetime.now(UTC) + timedelta(hours=1),
        "sub": sub or str(uuid.uuid4()),
        "iss": _ISSUER,
        "aud": _JWT_AUDIENCE,
    }
    if email is not None:
        payload["email"] = email
    return jwt.encode(payload, _SECRET, algorithm="HS256")


async def _call(token: str | None, *, allowlist: set[str]) -> str:
    creds = (
        HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)
        if token is not None
        else None
    )
    with (
        patch(
            "app.core.auth._jwks_client.get_signing_key_from_jwt",
            return_value=_make_signing_key(),
        ),
        patch("app.core.auth.get_settings") as mock_auth_settings,
        patch("app.core.admin_auth.get_settings") as mock_admin_settings,
    ):
        mock_auth_settings.return_value.supabase_url = "https://example.supabase.co"
        mock_auth_settings.return_value.is_production = False
        mock_admin_settings.return_value.admin_allowlist_set = allowlist

        def _decode(token: str, key: str, **kwargs: object) -> dict[str, object]:
            kwargs.pop("algorithms", None)
            return _real_jwt_decode(token, key, algorithms=["HS256"], **kwargs)

        with patch("app.core.auth.jwt.decode", side_effect=_decode):
            return await get_admin_email(creds)


async def test_accepts_allowlisted_admin_email() -> None:
    token = _make_token(email="admin@example.com")
    result = await _call(token, allowlist={"admin@example.com"})
    assert result == "admin@example.com"


async def test_rejects_email_not_on_allowlist() -> None:
    token = _make_token(email="stranger@example.com")
    with pytest.raises(ForbiddenError):
        await _call(token, allowlist={"admin@example.com"})


async def test_allowlist_check_is_case_insensitive() -> None:
    token = _make_token(email="Admin@Example.com")
    result = await _call(token, allowlist={"admin@example.com"})
    assert result == "admin@example.com"


async def test_rejects_token_with_no_email_claim() -> None:
    token = _make_token(email=None)
    with pytest.raises(ForbiddenError):
        await _call(token, allowlist={"admin@example.com"})


async def test_rejects_missing_credentials() -> None:
    with pytest.raises(UnauthorizedError):
        await _call(None, allowlist={"admin@example.com"})


async def test_rejects_invalid_token() -> None:
    with pytest.raises(UnauthorizedError):
        await _call("not-a-real-jwt", allowlist={"admin@example.com"})
