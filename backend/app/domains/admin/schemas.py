"""Pydantic schemas for the admin AI-observability API."""

from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.ai.models import AiFeature, AiTraceStatus


class AiTraceRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    feature: AiFeature
    model: str
    status: AiTraceStatus
    latency_ms: int
    prompt_tokens: int | None
    completion_tokens: int | None
    linked_entity_type: str | None
    linked_entity_id: uuid.UUID | None
    response_excerpt: str | None
    error_message: str | None
    created_at: datetime


class AiTraceStats(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    feature: AiFeature
    status: AiTraceStatus
    count: int
    avg_latency_ms: float
