"""Background jobs: voice transcription/extraction, receipt OCR.

Runs via FastAPI's `BackgroundTasks` in the same process as the API, scheduled
from `service.py` after the triggering request commits. Each job opens its own
DB session with `SessionFactory` since it runs after the request's session has
already closed.

Voice pipeline (two stages):
  Stage 1 (process_voice): download audio → STT → save transcript → status=transcribed
  Stage 2 (extract_voice): LLM extraction → draft transaction → status=completed
  (Stage 2 is triggered by the user after reviewing the transcript via the API.)

Receipt pipeline (one stage):
  process_receipt: download image → vision LLM → draft transaction → status=completed
"""

from __future__ import annotations

import asyncio
import uuid
from pathlib import Path

import structlog

from app.ai.llm.openrouter import OpenRouterLLM
from app.ai.stt.base import STTProvider
from app.core.database import SessionFactory
from app.core.upload_utils import IMAGE_EXT_MAP
from app.domains.finance import repository as repo
from app.domains.finance.extractor import extract_transactions
from app.domains.finance.models import TransactionSource, TransactionStatus, VoiceProcessingStatus
from app.domains.finance.receipt_extractor import extract_transactions_from_receipt
from app.shared.storage import R2Storage

log = structlog.get_logger()

_EXT_TO_MIME = {ext: mime for mime, ext in IMAGE_EXT_MAP.items()}

# Shown to the user as-is (ChatBubble renders it directly); the real
# exception is only ever logged via structlog, never persisted to the DB.
_GENERIC_FAILURE_MESSAGE = "Processing failed. Please try again."

RECEIPT_EXTRACTION_DEADLINE_SECONDS = 60


async def process_voice(
    *, stt: STTProvider, r2: R2Storage, voice_log_id: str, account_id: str
) -> None:
    """Stage 1: Transcribe audio and pause for user review."""
    log_id = uuid.UUID(voice_log_id)
    voice_log = None

    async with SessionFactory() as session:
        try:
            voice_log = await repo.get_voice_log(session, log_id)
            if voice_log is None:
                log.error("voice_log_not_found", voice_log_id=voice_log_id)
                return

            await repo.update_voice_log_status(
                session, voice_log, VoiceProcessingStatus.transcribing
            )
            await session.commit()

            audio = await r2.download(voice_log.audio_url)
            transcript = await stt.transcribe(
                audio,
                filename=Path(voice_log.audio_url).name,
            )

            claimed = await repo.update_voice_log_status_if(
                session,
                voice_log.id,
                expected_statuses=[VoiceProcessingStatus.transcribing],
                status=VoiceProcessingStatus.transcribed,
                transcript=transcript,
            )
            if claimed:
                await session.commit()
            else:
                log.warning("voice_transcription_lost_race", voice_log_id=voice_log_id)
                await session.rollback()

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
                        err_session,
                        vl,
                        VoiceProcessingStatus.failed,
                        error_message=_GENERIC_FAILURE_MESSAGE,
                    )
                    await err_session.commit()
        finally:
            if voice_log is not None:
                try:
                    await r2.delete(voice_log.audio_url)
                except Exception as cleanup_exc:
                    log.warning(
                        "voice_audio_cleanup_failed",
                        voice_log_id=voice_log_id,
                        error=str(cleanup_exc),
                    )


async def extract_voice(
    *,
    llm: OpenRouterLLM,
    voice_log_id: str,
    account_id: str,
    transcript: str,
    chat_session_id: str | None = None,
) -> None:
    """Stage 2: Run LLM extraction on (possibly user-edited) transcript."""
    log_id = uuid.UUID(voice_log_id)
    acc_id = uuid.UUID(account_id)
    session_id = uuid.UUID(chat_session_id) if chat_session_id else None

    async with SessionFactory() as session:
        try:
            voice_log = await repo.get_voice_log(session, log_id)
            if voice_log is None:
                log.error("voice_log_not_found", voice_log_id=voice_log_id)
                return

            await repo.update_voice_log_status(session, voice_log, VoiceProcessingStatus.extracting)
            await session.commit()

            extracted_list = await extract_transactions(transcript, llm)

            extracted_data: list[dict[str, object]] = []
            for extracted in extracted_list:
                note = extracted.note or transcript
                await repo.create_transaction(
                    session,
                    voice_log.user_id,
                    account_id=acc_id,
                    amount=extracted.amount,
                    currency=extracted.currency,
                    merchant=extracted.merchant,
                    note=note,
                    occurred_at=voice_log.created_at,
                    source=TransactionSource.voice,
                    status=TransactionStatus.draft,
                    voice_log_id=voice_log.id,
                    chat_session_id=session_id,
                )
                extracted_data.append({**extracted.model_dump(), "note": note})

            # Highest confidence across all extracted items, for the log's summary field.
            top_confidence = max(item.confidence for item in extracted_list)
            claimed = await repo.update_voice_log_status_if(
                session,
                voice_log.id,
                expected_statuses=[VoiceProcessingStatus.extracting],
                status=VoiceProcessingStatus.completed,
                extracted_data=extracted_data,
                confidence_score=top_confidence,
            )
            if claimed:
                await session.commit()
            else:
                log.warning("voice_extraction_lost_race", voice_log_id=voice_log_id)
                await session.rollback()

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
                        err_session,
                        vl,
                        VoiceProcessingStatus.failed,
                        error_message=_GENERIC_FAILURE_MESSAGE,
                    )
                    await err_session.commit()


async def process_receipt(
    *,
    vision_llm: OpenRouterLLM,
    r2: R2Storage,
    receipt_log_id: str,
    account_id: str,
    chat_session_id: str | None = None,
) -> None:
    """Extract a transaction from a receipt image."""
    log_id = uuid.UUID(receipt_log_id)
    acc_id = uuid.UUID(account_id)
    session_id = uuid.UUID(chat_session_id) if chat_session_id else None
    receipt_log = None

    async with SessionFactory() as session:
        try:
            receipt_log = await repo.get_receipt_log(session, log_id)
            if receipt_log is None:
                log.error("receipt_log_not_found", receipt_log_id=receipt_log_id)
                return

            await repo.update_receipt_log_status(
                session, receipt_log, VoiceProcessingStatus.extracting
            )
            await session.commit()

            image_bytes = await r2.download(receipt_log.image_url)
            suffix = Path(receipt_log.image_url).suffix.lower()
            media_type = _EXT_TO_MIME.get(suffix, "image/jpeg")

            extracted_list = await asyncio.wait_for(
                extract_transactions_from_receipt(image_bytes, media_type, vision_llm),
                timeout=RECEIPT_EXTRACTION_DEADLINE_SECONDS,
            )

            extracted_data: list[dict[str, object]] = []
            for extracted in extracted_list:
                await repo.create_transaction(
                    session,
                    receipt_log.user_id,
                    account_id=acc_id,
                    amount=extracted.amount,
                    currency=extracted.currency,
                    merchant=extracted.merchant,
                    note=extracted.note or extracted.category_name,
                    occurred_at=receipt_log.created_at,
                    source=TransactionSource.receipt,
                    status=TransactionStatus.draft,
                    receipt_log_id=receipt_log.id,
                    chat_session_id=session_id,
                )
                extracted_data.append(extracted.model_dump())

            claimed = await repo.update_receipt_log_status_if(
                session,
                receipt_log.id,
                expected_statuses=[VoiceProcessingStatus.extracting],
                status=VoiceProcessingStatus.completed,
                ocr_text=extracted_list[0].note,
                extracted_data=extracted_data,
            )
            if claimed:
                await session.commit()
            else:
                log.warning("receipt_processing_lost_race", receipt_log_id=receipt_log_id)
                await session.rollback()

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
                        err_session,
                        rl,
                        VoiceProcessingStatus.failed,
                        error_message=_GENERIC_FAILURE_MESSAGE,
                    )
                    await err_session.commit()
        finally:
            if receipt_log is not None:
                try:
                    await r2.delete(receipt_log.image_url)
                except Exception as cleanup_exc:
                    log.warning(
                        "receipt_image_cleanup_failed",
                        receipt_log_id=receipt_log_id,
                        error=str(cleanup_exc),
                    )
