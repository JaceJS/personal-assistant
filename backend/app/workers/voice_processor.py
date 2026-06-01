"""ARQ voice-processing worker.

Pipeline per job:
  1. Download audio from R2.
  2. Transcribe with OpenRouter STT.
  3. Extract transaction fields with OpenRouter LLM.
  4. Save a draft Transaction and mark the VoiceLog completed.
"""

from __future__ import annotations

import uuid
from pathlib import Path
from typing import ClassVar

import structlog

from app.ai.llm.openrouter import OpenRouterLLM
from app.ai.stt.factory import get_stt_provider
from app.core.config import get_settings
from app.core.database import SessionFactory
from app.core.logging import configure_logging
from app.domains.finance import repository as repo
from app.domains.finance.extractor import extract_transaction
from app.domains.finance.models import TransactionSource, TransactionStatus, VoiceProcessingStatus
from app.shared.queue import redis_settings
from app.shared.storage import R2Storage

_settings = get_settings()
log = structlog.get_logger()


async def startup(ctx: dict) -> None:  # type: ignore[type-arg]
    configure_logging()
    ctx["stt"] = get_stt_provider(_settings)
    ctx["llm"] = OpenRouterLLM(_settings)
    ctx["r2"] = R2Storage(_settings)


async def shutdown(ctx: dict) -> None:  # type: ignore[type-arg]
    pass


async def process_voice(
    ctx: dict,  # type: ignore[type-arg]
    *,
    voice_log_id: str,
    account_id: str,
) -> None:
    """Transcribe audio, extract a transaction, and save it as a draft."""
    stt = ctx["stt"]
    llm = ctx["llm"]
    r2: R2Storage = ctx["r2"]

    log_id = uuid.UUID(voice_log_id)
    acc_id = uuid.UUID(account_id)

    async with SessionFactory() as session:
        voice_log = await repo.get_voice_log(session, log_id)
        if voice_log is None:
            log.error("voice_log_not_found", voice_log_id=voice_log_id)
            return

        try:
            await repo.update_voice_log_status(
                session, voice_log, VoiceProcessingStatus.transcribing
            )
            await session.commit()

            audio = await r2.download(voice_log.audio_url)
            transcript = await stt.transcribe(
                audio,
                filename=Path(voice_log.audio_url).name,
            )

            await repo.update_voice_log_status(
                session, voice_log, VoiceProcessingStatus.extracting, transcript=transcript
            )
            await session.commit()

            extracted = await extract_transaction(transcript, llm)

            await repo.create_transaction(
                session, voice_log.user_id,
                account_id=acc_id,
                amount=extracted.amount,
                currency=extracted.currency,
                merchant=extracted.merchant,
                note=extracted.note or extracted.category_name,
                occurred_at=voice_log.created_at,
                source=TransactionSource.voice,
                status=TransactionStatus.draft,
                voice_log_id=voice_log.id,
            )
            await repo.update_voice_log_status(
                session, voice_log, VoiceProcessingStatus.completed,
                extracted_data=extracted.model_dump(),
                confidence_score=extracted.confidence,
            )
            await session.commit()

        except Exception as exc:
            error_message = f"{type(exc).__name__}: {exc}"
            log.error(
                "voice_processing_failed",
                voice_log_id=voice_log_id,
                error_type=type(exc).__name__,
                error=str(exc),
            )
            async with SessionFactory() as err_session:
                vl = await repo.get_voice_log(err_session, log_id)
                if vl is not None:
                    await repo.update_voice_log_status(
                        err_session,
                        vl,
                        VoiceProcessingStatus.failed,
                        error_message=error_message,
                    )
                    await err_session.commit()
        finally:
            try:
                await r2.delete(voice_log.audio_url)
            except Exception as cleanup_exc:
                log.warning(
                    "voice_audio_cleanup_failed",
                    voice_log_id=voice_log_id,
                    error=str(cleanup_exc),
                )


class WorkerSettings:
    functions: ClassVar[list[object]] = [process_voice]
    on_startup = startup
    on_shutdown = shutdown
    redis_settings = redis_settings(_settings)
