"""Supabase Auth Admin client (service-role key) for permanent account deletion."""

from __future__ import annotations

import uuid

import httpx

from app.core.config import Settings, get_settings

_ADMIN_TIMEOUT_SECONDS = 10.0
# 404 counts as success so deletion is idempotent.
_OK_STATUS = frozenset({200, 204, 404})


class SupabaseAdminError(Exception):
    pass


class SupabaseAdmin:
    def __init__(self, settings: Settings) -> None:
        self._base_url = settings.supabase_url.rstrip("/")
        self._service_role_key = settings.supabase_service_role_key

    async def delete_user(self, user_id: uuid.UUID) -> None:
        if not self._service_role_key:
            raise SupabaseAdminError("SUPABASE_SERVICE_ROLE_KEY is not configured")

        url = f"{self._base_url}/auth/v1/admin/users/{user_id}"
        headers = {
            "Authorization": f"Bearer {self._service_role_key}",
            "apikey": self._service_role_key,
        }
        async with httpx.AsyncClient(timeout=_ADMIN_TIMEOUT_SECONDS) as client:
            response = await client.delete(url, headers=headers)

        if response.status_code not in _OK_STATUS:
            raise SupabaseAdminError(
                f"Supabase admin delete_user failed (HTTP {response.status_code})"
            )


def get_supabase_admin() -> SupabaseAdmin:
    return SupabaseAdmin(get_settings())
