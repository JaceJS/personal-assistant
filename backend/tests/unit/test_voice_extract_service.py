"""Unit tests for extract_voice_transcript: guards against re-extraction abuse.

Security review finding: the endpoint only checked processing_status was
"transcribed" but never flipped it before scheduling the extraction job, so
a burst of requests sent before the background task picks up the first job
could all pass the check and schedule N paid LLM extraction jobs for one
voice log.

Follow-up finding: flipping status via a plain read-then-write (flush, not
commit) still let two concurrent requests in separate DB transactions both
pass the check before either committed. The fix moved the check into the
UPDATE's WHERE clause (`update_voice_log_status_if`), so only one writer can
ever win, regardless of transaction timing.
"""

from __future__ import annotations

import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import BackgroundTasks

from app.core.exceptions import BadRequestError
from app.domains.finance import service as finance_service
from app.domains.finance.models import VoiceLog, VoiceProcessingStatus

_USER_ID = uuid.uuid4()
_VOICE_LOG_ID = uuid.uuid4()
_ACCOUNT_ID = uuid.uuid4()


def _make_voice_log(
    *, status: VoiceProcessingStatus = VoiceProcessingStatus.transcribed
) -> VoiceLog:
    voice_log = MagicMock(spec=VoiceLog)
    voice_log.id = _VOICE_LOG_ID
    voice_log.user_id = _USER_ID
    voice_log.account_id = _ACCOUNT_ID
    voice_log.processing_status = status
    return voice_log


async def test_extract_claims_status_atomically_before_enqueue() -> None:
    session = AsyncMock()
    background_tasks = BackgroundTasks()
    voice_log = _make_voice_log()

    with (
        patch("app.domains.finance.service.repo") as mock_repo,
        patch("app.domains.finance.service.ai_repo") as mock_ai_repo,
    ):
        mock_ai_repo.get_or_create_session = AsyncMock(return_value=MagicMock(id=uuid.uuid4()))
        mock_repo.get_voice_log = AsyncMock(return_value=voice_log)
        mock_repo.update_voice_log_status_if = AsyncMock(return_value=True)

        await finance_service.extract_voice_transcript(
            session,
            _USER_ID,
            _VOICE_LOG_ID,
            transcript="kopi 15rb",
            background_tasks=background_tasks,
        )

    mock_repo.update_voice_log_status_if.assert_called_once_with(
        session,
        _VOICE_LOG_ID,
        expected_statuses=[VoiceProcessingStatus.transcribed],
        status=VoiceProcessingStatus.extracting,
    )
    # The job is only scheduled once the atomic claim succeeds.
    assert len(background_tasks.tasks) == 1


async def test_extract_rejects_when_already_extracting() -> None:
    session = AsyncMock()
    background_tasks = BackgroundTasks()
    voice_log = _make_voice_log(status=VoiceProcessingStatus.extracting)

    with (
        patch("app.domains.finance.service.repo") as mock_repo,
        patch("app.domains.finance.service.ai_repo") as mock_ai_repo,
    ):
        mock_ai_repo.get_or_create_session = AsyncMock(return_value=MagicMock(id=uuid.uuid4()))
        mock_repo.get_voice_log = AsyncMock(return_value=voice_log)
        mock_repo.update_voice_log_status_if = AsyncMock(return_value=False)

        with pytest.raises(BadRequestError):
            await finance_service.extract_voice_transcript(
                session,
                _USER_ID,
                _VOICE_LOG_ID,
                transcript="kopi 15rb",
                background_tasks=background_tasks,
            )

    assert len(background_tasks.tasks) == 0


async def test_extract_rejects_when_a_concurrent_request_wins_the_race() -> None:
    """Even if the loaded object still shows "transcribed" (stale read), a
    losing atomic claim (another request already committed first) must still
    reject the request instead of scheduling a duplicate job."""
    session = AsyncMock()
    background_tasks = BackgroundTasks()
    voice_log = _make_voice_log(status=VoiceProcessingStatus.transcribed)

    with (
        patch("app.domains.finance.service.repo") as mock_repo,
        patch("app.domains.finance.service.ai_repo") as mock_ai_repo,
    ):
        mock_ai_repo.get_or_create_session = AsyncMock(return_value=MagicMock(id=uuid.uuid4()))
        mock_repo.get_voice_log = AsyncMock(return_value=voice_log)
        mock_repo.update_voice_log_status_if = AsyncMock(return_value=False)

        with pytest.raises(BadRequestError):
            await finance_service.extract_voice_transcript(
                session,
                _USER_ID,
                _VOICE_LOG_ID,
                transcript="kopi 15rb",
                background_tasks=background_tasks,
            )

    assert len(background_tasks.tasks) == 0
