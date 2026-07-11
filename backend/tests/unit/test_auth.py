"""Unit tests for get_current_user (Supabase JWT verification)."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta
from unittest.mock import MagicMock, patch

import jwt
import pytest
from fastapi.security import HTTPAuthorizationCredentials

from app.core.auth import _JWT_AUDIENCE, get_current_user
from app.core.exceptions import UnauthorizedError

_SECRET = "test-signing-secret"
_ISSUER = "https://example.supabase.co/auth/v1"
_real_jwt_decode = jwt.decode


def _make_signing_key() -> MagicMock:
    key = MagicMock()
    key.key = _SECRET
    return key


def _make_token(
    *, sub: str | None, issuer: str | None, audience: str | None = _JWT_AUDIENCE
) -> str:
    payload: dict[str, object] = {"exp": datetime.now(UTC) + timedelta(hours=1)}
    if sub is not None:
        payload["sub"] = sub
    if issuer is not None:
        payload["iss"] = issuer
    if audience is not None:
        payload["aud"] = audience
    return jwt.encode(payload, _SECRET, algorithm="HS256")


async def _call(token: str) -> uuid.UUID:
    creds = HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)
    with (
        patch(
            "app.core.auth._jwks_client.get_signing_key_from_jwt",
            return_value=_make_signing_key(),
        ),
        patch("app.core.auth.get_settings") as mock_settings,
    ):
        mock_settings.return_value.supabase_url = "https://example.supabase.co"
        mock_settings.return_value.is_production = False
        # Production code restricts algorithms to RS256/ES256; the test token is
        # HS256-signed for simplicity, so redirect the decode call to HS256 while
        # forwarding whatever audience/issuer kwargs the real code passes.
        def _decode(token: str, key: str, **kwargs: object) -> dict[str, object]:
            kwargs.pop("algorithms", None)
            return _real_jwt_decode(token, key, algorithms=["HS256"], **kwargs)

        with patch("app.core.auth.jwt.decode", side_effect=_decode):
            return await get_current_user(creds)


async def test_accepts_token_with_matching_issuer() -> None:
    user_id = uuid.uuid4()
    token = _make_token(sub=str(user_id), issuer=_ISSUER)
    assert await _call(token) == user_id


async def test_rejects_token_with_wrong_issuer() -> None:
    token = _make_token(sub=str(uuid.uuid4()), issuer="https://evil.example.com/auth/v1")
    with pytest.raises(UnauthorizedError):
        await _call(token)


async def test_rejects_token_with_missing_issuer() -> None:
    token = _make_token(sub=str(uuid.uuid4()), issuer=None)
    with pytest.raises(UnauthorizedError):
        await _call(token)


async def test_rejects_token_with_missing_subject() -> None:
    token = _make_token(sub=None, issuer=_ISSUER)
    with pytest.raises(UnauthorizedError):
        await _call(token)


async def test_rejects_token_with_missing_expiry() -> None:
    payload = {"sub": str(uuid.uuid4()), "iss": _ISSUER, "aud": _JWT_AUDIENCE}
    token = jwt.encode(payload, _SECRET, algorithm="HS256")
    with pytest.raises(UnauthorizedError):
        await _call(token)
