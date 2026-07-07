"""Pydantic schemas for the users domain."""

from __future__ import annotations

from pydantic import BaseModel


class AvatarUploadResponse(BaseModel):
    url: str
