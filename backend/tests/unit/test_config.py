"""Unit tests for Settings' comma-separated-list parsing properties.

Existing admin-auth tests (test_admin_auth.py) always mock get_settings()
with a pre-built set, so Settings.admin_allowlist_set's own parsing logic
(splitting, trimming, lowercasing) had zero direct coverage. These tests
build real Settings instances and exercise that parsing directly.
"""

from __future__ import annotations

from app.core.config import Settings


def _settings(admin_allowlist: str) -> Settings:
    # model_config reads .env by default; passing every field explicitly
    # here would be noise, so only override what each test cares about.
    return Settings(admin_allowlist=admin_allowlist)


def test_admin_allowlist_set_splits_comma_separated_emails() -> None:
    settings = _settings("a@x.com,b@y.com")
    assert settings.admin_allowlist_set == {"a@x.com", "b@y.com"}


def test_admin_allowlist_set_trims_whitespace_around_commas() -> None:
    settings = _settings(" a@x.com , b@y.com ")
    assert settings.admin_allowlist_set == {"a@x.com", "b@y.com"}


def test_admin_allowlist_set_lowercases_for_case_insensitive_match() -> None:
    settings = _settings("Admin@X.com")
    assert settings.admin_allowlist_set == {"admin@x.com"}


def test_admin_allowlist_set_ignores_empty_segments_from_trailing_comma() -> None:
    settings = _settings("a@x.com,")
    assert settings.admin_allowlist_set == {"a@x.com"}


def test_admin_allowlist_set_empty_string_yields_empty_set() -> None:
    settings = _settings("")
    assert settings.admin_allowlist_set == set()
