"""Integration tests: POST /api/v1/voice/process-anonymous (no auth required)."""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
import sqlalchemy as sa
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.finance.models import VoiceLog

pytestmark = pytest.mark.integration

_AUDIO_FILE = ("recording.m4a", b"fake audio bytes", "audio/m4a")
_TEXT_FILE = ("note.txt", b"not audio", "text/plain")
_EXTRACTED = {
    "amount": -50_000,
    "currency": "IDR",
    "merchant": "Warung Makan",
    "category_name": "Food",
    "note": None,
    "confidence": 0.92,
}


def _mock_stt(transcript: str = "beli makan gocap di warung") -> AsyncMock:
    stt = AsyncMock()
    stt.transcribe = AsyncMock(return_value=transcript)
    return stt


def _mock_llm(extracted: dict | None = None) -> MagicMock:
    from app.domains.finance.extractor import ExtractedTransaction

    data = extracted or _EXTRACTED
    result = ExtractedTransaction(**data)
    llm = MagicMock()
    llm.extract = AsyncMock(return_value=result)
    return llm


def _mock_redis(incr_return: int = 1) -> AsyncMock:
    redis = AsyncMock()
    pipe = MagicMock()
    pipe.set = MagicMock()
    pipe.incr = MagicMock()
    pipe.execute = AsyncMock(return_value=[None, incr_return])
    redis.pipeline = MagicMock(return_value=pipe)
    redis.close = AsyncMock()
    return redis


async def test_process_anonymous_returns_extracted_transaction(
    client: AsyncClient,
) -> None:
    stt = _mock_stt()
    llm = _mock_llm()
    redis = _mock_redis(incr_return=1)

    with (
        patch("app.domains.finance.routers.voice.get_stt_provider", return_value=stt),
        patch("app.domains.finance.routers.voice.OpenRouterLLM", return_value=llm),
        patch("app.domains.finance.routers.voice.create_redis_pool", AsyncMock(return_value=redis)),
        patch("app.core.upload_utils.filetype.guess") as mock_guess,
    ):
        mock_guess.return_value.mime = "audio/webm"
        response = await client.post(
            "/api/v1/voice/process-anonymous",
            files={"file": _AUDIO_FILE},
        )

    assert response.status_code == 200
    data = response.json()["data"]
    assert data["amount"] == -50_000
    assert data["currency"] == "IDR"
    assert data["merchant"] == "Warung Makan"
    assert data["category_name"] == "Food"
    assert data["confidence"] == 0.92


async def test_process_anonymous_rejects_non_audio_file(client: AsyncClient) -> None:
    redis = _mock_redis()

    mock_pool = AsyncMock(return_value=redis)
    with (
        patch("app.domains.finance.routers.voice.create_redis_pool", mock_pool),
        patch("app.core.upload_utils.filetype.guess", return_value=None),
    ):
        response = await client.post(
            "/api/v1/voice/process-anonymous",
            files={"file": _TEXT_FILE},
        )

    assert response.status_code == 400


async def test_process_anonymous_rate_limited_after_10_requests(
    client: AsyncClient,
) -> None:
    redis = _mock_redis(incr_return=11)

    with (
        patch("app.domains.finance.routers.voice.create_redis_pool", AsyncMock(return_value=redis)),
        patch("app.core.upload_utils.filetype.guess") as mock_guess,
    ):
        mock_guess.return_value.mime = "audio/webm"
        response = await client.post(
            "/api/v1/voice/process-anonymous",
            files={"file": _AUDIO_FILE},
        )

    assert response.status_code == 429


async def test_process_anonymous_does_not_save_voice_log(
    client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    stt = _mock_stt()
    llm = _mock_llm()
    redis = _mock_redis()

    with (
        patch("app.domains.finance.routers.voice.get_stt_provider", return_value=stt),
        patch("app.domains.finance.routers.voice.OpenRouterLLM", return_value=llm),
        patch("app.domains.finance.routers.voice.create_redis_pool", AsyncMock(return_value=redis)),
        patch("app.core.upload_utils.filetype.guess") as mock_guess,
    ):
        mock_guess.return_value.mime = "audio/webm"
        response = await client.post(
            "/api/v1/voice/process-anonymous",
            files={"file": _AUDIO_FILE},
        )

    assert response.status_code == 200
    result = await db_session.execute(sa.select(sa.func.count()).select_from(VoiceLog))
    assert result.scalar() == 0


async def test_process_anonymous_no_auth_required() -> None:
    from httpx import ASGITransport
    from httpx import AsyncClient as RawClient

    from app.main import app as fastapi_app

    stt = _mock_stt()
    llm = _mock_llm()
    redis = _mock_redis()

    with (
        patch("app.domains.finance.routers.voice.get_stt_provider", return_value=stt),
        patch("app.domains.finance.routers.voice.OpenRouterLLM", return_value=llm),
        patch("app.domains.finance.routers.voice.create_redis_pool", AsyncMock(return_value=redis)),
        patch("app.core.upload_utils.filetype.guess") as mock_guess,
    ):
        mock_guess.return_value.mime = "audio/webm"
        async with RawClient(
            transport=ASGITransport(app=fastapi_app), base_url="http://test"
        ) as ac:
            response = await ac.post(
                "/api/v1/voice/process-anonymous",
                files={"file": _AUDIO_FILE},
            )

    assert response.status_code == 200
