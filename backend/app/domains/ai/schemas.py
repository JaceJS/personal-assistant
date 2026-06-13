"""Pydantic schemas for the AI chat endpoint."""

from __future__ import annotations

from pydantic import BaseModel


class ChatRequest(BaseModel):
    message: str


class ChatReply(BaseModel):
    reply: str
