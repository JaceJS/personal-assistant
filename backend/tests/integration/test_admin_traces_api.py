"""Integration tests: admin AI-observability endpoints (GET /admin/traces)."""

from __future__ import annotations

import uuid
from collections.abc import AsyncGenerator

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession

from app.ai.models import AiFeature, AiTrace, AiTraceStatus
from app.core.admin_auth import get_admin_email
from app.core.database import get_session
from app.main import app

pytestmark = pytest.mark.integration

_ADMIN_EMAIL = "admin@example.com"


@pytest_asyncio.fixture
async def admin_client(db_engine: AsyncEngine) -> AsyncGenerator[AsyncClient, None]:
    """Authenticated-as-admin ASGI test client backed by the test database."""

    async def _get_session() -> AsyncGenerator[AsyncSession, None]:
        async with AsyncSession(db_engine, expire_on_commit=False) as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise

    def _get_admin_email() -> str:
        return _ADMIN_EMAIL

    app.dependency_overrides[get_session] = _get_session
    app.dependency_overrides[get_admin_email] = _get_admin_email

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()


async def _seed_trace(
    db_session: AsyncSession,
    *,
    user_id: uuid.UUID,
    feature: AiFeature = AiFeature.chat,
    status: AiTraceStatus = AiTraceStatus.success,
) -> AiTrace:
    trace = AiTrace(
        user_id=user_id,
        feature=feature,
        model="test-model",
        status=status,
        latency_ms=100,
    )
    db_session.add(trace)
    await db_session.commit()
    await db_session.refresh(trace)
    return trace


async def test_finance_authenticated_client_cannot_reach_admin_routes(
    client: AsyncClient,
) -> None:
    """`client` overrides get_current_user (a real user) but not
    get_admin_email -- no bearer token reaches AdminUser, so it's rejected
    the same as any other unauthenticated request. The allowlist-rejection
    case (a valid token whose email isn't allowlisted) is unit-tested in
    test_admin_auth.py.
    """
    response = await client.get("/api/v1/admin/traces")
    assert response.status_code == 401


async def test_unauthenticated_request_is_rejected() -> None:
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as anon_client:
        response = await anon_client.get("/api/v1/admin/traces")
    assert response.status_code == 401


async def test_admin_can_list_traces(
    admin_client: AsyncClient, db_session: AsyncSession, test_user_id: uuid.UUID
) -> None:
    await _seed_trace(db_session, user_id=test_user_id)

    response = await admin_client.get("/api/v1/admin/traces")

    assert response.status_code == 200
    body = response.json()
    assert body["meta"]["total"] >= 1
    assert any(item["user_id"] == str(test_user_id) for item in body["data"])


async def test_admin_can_filter_traces_by_status(
    admin_client: AsyncClient, db_session: AsyncSession, test_user_id: uuid.UUID
) -> None:
    await _seed_trace(db_session, user_id=test_user_id, status=AiTraceStatus.success)
    error_trace = await _seed_trace(db_session, user_id=test_user_id, status=AiTraceStatus.error)

    response = await admin_client.get("/api/v1/admin/traces", params={"status": "error"})

    assert response.status_code == 200
    ids = {item["id"] for item in response.json()["data"]}
    assert str(error_trace.id) in ids
    assert all(item["status"] == "error" for item in response.json()["data"])


async def test_admin_can_get_trace_detail(
    admin_client: AsyncClient, db_session: AsyncSession, test_user_id: uuid.UUID
) -> None:
    trace = await _seed_trace(db_session, user_id=test_user_id)

    response = await admin_client.get(f"/api/v1/admin/traces/{trace.id}")

    assert response.status_code == 200
    assert response.json()["data"]["id"] == str(trace.id)


async def test_admin_get_trace_detail_404_for_unknown_id(admin_client: AsyncClient) -> None:
    response = await admin_client.get(f"/api/v1/admin/traces/{uuid.uuid4()}")
    assert response.status_code == 404


async def test_admin_can_get_trace_stats(
    admin_client: AsyncClient, db_session: AsyncSession, test_user_id: uuid.UUID
) -> None:
    await _seed_trace(
        db_session, user_id=test_user_id, feature=AiFeature.chat, status=AiTraceStatus.success
    )
    await _seed_trace(
        db_session, user_id=test_user_id, feature=AiFeature.chat, status=AiTraceStatus.success
    )
    await _seed_trace(
        db_session, user_id=test_user_id, feature=AiFeature.chat, status=AiTraceStatus.error
    )

    response = await admin_client.get("/api/v1/admin/traces/stats")

    assert response.status_code == 200
    rows = {(row["feature"], row["status"]): row for row in response.json()["data"]}
    assert rows[("chat", "success")]["count"] >= 2
    assert rows[("chat", "error")]["count"] >= 1
    assert rows[("chat", "success")]["avg_latency_ms"] > 0


async def test_non_admin_cannot_get_trace_stats(client: AsyncClient) -> None:
    response = await client.get("/api/v1/admin/traces/stats")
    assert response.status_code == 401
