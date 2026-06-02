"""ARQ background workers: voice transcription, voice extraction, and receipt scanning.

Voice pipeline (two stages):
  Stage 1 — process_voice: download audio → STT → save transcript → status=transcribed
  Stage 2 — extract_voice: LLM extraction → draft transaction → status=completed
  (Stage 2 is triggered by the user after reviewing the transcript via the API.)

Receipt pipeline (one stage):
  process_receipt: download image → vision LLM → draft transaction → status=completed
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
from app.domains.finance.receipt_extractor import extract_from_receipt
from app.shared.queue import redis_settings
from app.shared.storage import R2Storage

_settings = get_settings()
log = structlog.get_logger()


async def startup(ctx: dict) -> None:  # type: ignore[type-arg]
    configure_logging()
    ctx["stt"] = get_stt_provider(_settings)
    ctx["llm"] = OpenRouterLLM(_settings)
    ctx["vision_llm"] = OpenRouterLLM(_settings, model=_settings.receipt_model)
    ctx["r2"] = R2Storage(_settings)


async def shutdown(ctx: dict) -> None:  # type: ignore[type-arg]
    pass


async def process_voice(
    ctx: dict,  # type: ignore[type-arg]
    *,
    voice_log_id: str,
    account_id: str,
) -> None:
    """Stage 1: Transcribe audio and pause for user review."""
    stt = ctx["stt"]
    r2: R2Storage = ctx["r2"]

    log_id = uuid.UUID(voice_log_id)

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
                session, voice_log, VoiceProcessingStatus.transcribed, transcript=transcript
            )
            await session.commit()

        except Exception as exc:
            log.error(
                "voice_transcription_failed",
                voice_log_id=voice_log_id,
                error_type=type(exc).__name__,
                error=str(exc),
            )
            async with SessionFactory() as err_session:
                vl = await repo.get_voice_log(err_session, log_id)
                if vl is not None:
                    await repo.update_voice_log_status(
                        err_session, vl, VoiceProcessingStatus.failed,
                        error_message=f"{type(exc).__name__}: {exc}",
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


async def extract_voice(
    ctx: dict,  # type: ignore[type-arg]
    *,
    voice_log_id: str,
    account_id: str,
    transcript: str,
) -> None:
    """Stage 2: Run LLM extraction on (possibly user-edited) transcript."""
    llm = ctx["llm"]

    log_id = uuid.UUID(voice_log_id)
    acc_id = uuid.UUID(account_id)

    async with SessionFactory() as session:
        voice_log = await repo.get_voice_log(session, log_id)
        if voice_log is None:
            log.error("voice_log_not_found", voice_log_id=voice_log_id)
            return

        try:
            await repo.update_voice_log_status(
                session, voice_log, VoiceProcessingStatus.extracting
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
            log.error(
                "voice_extraction_failed",
                voice_log_id=voice_log_id,
                error_type=type(exc).__name__,
                error=str(exc),
            )
            async with SessionFactory() as err_session:
                vl = await repo.get_voice_log(err_session, log_id)
                if vl is not None:
                    await repo.update_voice_log_status(
                        err_session, vl, VoiceProcessingStatus.failed,
                        error_message=f"{type(exc).__name__}: {exc}",
                    )
                    await err_session.commit()


async def process_receipt(
    ctx: dict,  # type: ignore[type-arg]
    *,
    receipt_log_id: str,
    account_id: str,
) -> None:
    """Extract a transaction from a receipt image."""
    vision_llm = ctx["vision_llm"]
    r2: R2Storage = ctx["r2"]

    log_id = uuid.UUID(receipt_log_id)
    acc_id = uuid.UUID(account_id)

    async with SessionFactory() as session:
        receipt_log = await repo.get_receipt_log(session, log_id)
        if receipt_log is None:
            log.error("receipt_log_not_found", receipt_log_id=receipt_log_id)
            return

        try:
            await repo.update_receipt_log_status(
                session, receipt_log, VoiceProcessingStatus.extracting
            )
            await session.commit()

            image_bytes = await r2.download(receipt_log.image_url)
            suffix = Path(receipt_log.image_url).suffix.lower()
            media_type = f"image/{suffix.lstrip('.') or 'jpeg'}"

            extracted = await extract_from_receipt(image_bytes, media_type, vision_llm)

            tx = await repo.create_transaction(
                session, receipt_log.user_id,
                account_id=acc_id,
                amount=extracted.amount,
                currency=extracted.currency,
                merchant=extracted.merchant,
                note=extracted.note or extracted.category_name,
                occurred_at=receipt_log.created_at,
                source=TransactionSource.receipt,
                status=TransactionStatus.draft,
            )
            await repo.update_receipt_log_status(
                session, receipt_log, VoiceProcessingStatus.completed,
                ocr_text=extracted.note,
                extracted_data=extracted.model_dump(),
                transaction_id=tx.id,
            )
            await session.commit()

        except Exception as exc:
            log.error(
                "receipt_processing_failed",
                receipt_log_id=receipt_log_id,
                error_type=type(exc).__name__,
                error=str(exc),
            )
            async with SessionFactory() as err_session:
                rl = await repo.get_receipt_log(err_session, log_id)
                if rl is not None:
                    await repo.update_receipt_log_status(
                        err_session, rl, VoiceProcessingStatus.failed,
                        error_message=f"{type(exc).__name__}: {exc}",
                    )
                    await err_session.commit()
        finally:
            try:
                await r2.delete(receipt_log.image_url)
            except Exception as cleanup_exc:
                log.warning(
                    "receipt_image_cleanup_failed",
                    receipt_log_id=receipt_log_id,
                    error=str(cleanup_exc),
                )


class WorkerSettings:
    functions: ClassVar[list[object]] = [process_voice, extract_voice, process_receipt]
    on_startup = startup
    on_shutdown = shutdown
    redis_settings = redis_settings(_settings)
