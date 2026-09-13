"""Admin-only HTTP routes for AI observability.

Gated by `AdminUser` (see app/core/admin_auth.py) -- a valid Supabase JWT
whose email is on ADMIN_ALLOWLIST -- not by CurrentUser/ownership checks,
since these routes deliberately read across all users' traces.
"""

from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Query

from app.ai.models import AiFeature, AiTraceStatus
from app.core.admin_auth import AdminUser
from app.core.database import DbSession
from app.core.response import ApiResponse, ok, paginated
from app.domains.admin import service
from app.domains.admin.schemas import AiTraceRead, AiTraceStats

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.get("/traces/stats", response_model=ApiResponse[list[AiTraceStats]])
async def get_trace_stats(
    _admin_email: AdminUser, session: DbSession
) -> ApiResponse[list[AiTraceStats]]:
    """Row counts and average latency grouped by feature x status.

    Registered before /traces/{trace_id} -- Starlette matches "stats" against
    that route too and fails the trace_id UUID conversion, so the literal
    route must come first to actually be reached.
    """
    stats = await service.get_trace_stats(session)
    return ok([AiTraceStats.model_validate(row) for row in stats])


@router.get("/traces", response_model=ApiResponse[list[AiTraceRead]])
async def list_traces(
    _admin_email: AdminUser,
    session: DbSession,
    feature: Annotated[AiFeature | None, Query()] = None,
    status: Annotated[AiTraceStatus | None, Query()] = None,
    limit: Annotated[int, Query(ge=1, le=200)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> ApiResponse[list[AiTraceRead]]:
    items, total = await service.list_traces(
        session, feature=feature, status=status, limit=limit, offset=offset
    )
    traces = [AiTraceRead.model_validate(item) for item in items]
    return paginated(traces, total=total, limit=limit, offset=offset)


@router.get("/traces/{trace_id}", response_model=ApiResponse[AiTraceRead])
async def get_trace(
    trace_id: uuid.UUID, _admin_email: AdminUser, session: DbSession
) -> ApiResponse[AiTraceRead]:
    trace = await service.get_trace(session, trace_id)
    return ok(AiTraceRead.model_validate(trace))
