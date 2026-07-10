"""Unit tests for get_client_ip (no DB/Redis needed)."""

from __future__ import annotations

from unittest.mock import MagicMock

from starlette.requests import Request

from app.core.request_utils import get_client_ip


def _make_request(*, headers: dict[str, str], peer: str | None = "10.0.0.1") -> Request:
    request = MagicMock(spec=Request)
    request.headers = headers
    request.client = MagicMock(host=peer) if peer else None
    return request


def test_trusts_fly_client_ip_header_unconditionally() -> None:
    request = _make_request(headers={"fly-client-ip": "203.0.113.7"})
    assert get_client_ip(request, trusted_proxies=[]) == "203.0.113.7"


def test_fly_client_ip_wins_over_x_forwarded_for() -> None:
    request = _make_request(
        headers={"fly-client-ip": "203.0.113.7", "x-forwarded-for": "198.51.100.1"}
    )
    assert get_client_ip(request, trusted_proxies=[]) == "203.0.113.7"


def test_uses_x_forwarded_for_when_peer_is_trusted() -> None:
    request = _make_request(
        headers={"x-forwarded-for": "198.51.100.1, 10.0.0.1"}, peer="10.0.0.1"
    )
    assert get_client_ip(request, trusted_proxies=["10.0.0.0/8"]) == "198.51.100.1"


def test_ignores_x_forwarded_for_when_peer_not_trusted() -> None:
    request = _make_request(headers={"x-forwarded-for": "198.51.100.1"}, peer="10.0.0.1")
    assert get_client_ip(request, trusted_proxies=["172.16.0.0/12"]) == "10.0.0.1"


def test_falls_back_to_peer_when_no_trusted_proxies_configured() -> None:
    request = _make_request(headers={"x-forwarded-for": "198.51.100.1"}, peer="10.0.0.1")
    assert get_client_ip(request, trusted_proxies=[]) == "10.0.0.1"


def test_returns_unknown_when_no_peer_and_no_fly_header() -> None:
    request = _make_request(headers={}, peer=None)
    assert get_client_ip(request, trusted_proxies=[]) == "unknown"
