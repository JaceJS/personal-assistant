import uuid
from typing import Annotated

from fastapi import APIRouter, File, Form, Request, UploadFile

from app.ai.llm.openrouter import OpenRouterLLM
from app.ai.stt.factory import get_stt_provider
from app.core.auth import CurrentUser
from app.core.config import get_settings
from app.core.response import ApiResponse, ok
from app.domains.finance import service
from app.domains.finance.routers.deps import DbSession
from app.domains.finance.schemas import (
    AnonymousVoiceResult,
    VoiceExtractRequest,
    VoiceExtractResponse,
    VoiceStatusRead,
    VoiceUploadResponse,
)
from app.shared.queue import create_redis_pool
from app.shared.storage import R2Storage

router = APIRouter(tags=["Voice"])


@router.post(
    "/voice/upload",
    response_model=ApiResponse[VoiceUploadResponse],
    status_code=201,
)
async def upload_voice(
    user_id: CurrentUser,
    session: DbSession,
    account_id: Annotated[uuid.UUID, Form()],
    file: Annotated[UploadFile, File()],
) -> ApiResponse[VoiceUploadResponse]:
    settings = get_settings()
    redis = await create_redis_pool(settings)
    try:
        item = await service.create_voice_upload(
            session,
            user_id,
            account_id=account_id,
            file=file,
            storage=R2Storage(settings),
            redis=redis,
        )
    finally:
        await redis.close()
    return ok(item, message="created")


@router.get("/voice/{voice_log_id}", response_model=ApiResponse[VoiceStatusRead])
async def get_voice_status(
    voice_log_id: uuid.UUID, user_id: CurrentUser, session: DbSession
) -> ApiResponse[VoiceStatusRead]:
    item = await service.get_voice_status(session, user_id, voice_log_id)
    return ok(item)


@router.post(
    "/voice/{voice_log_id}/extract",
    response_model=ApiResponse[VoiceExtractResponse],
)
async def extract_voice(
    voice_log_id: uuid.UUID,
    body: VoiceExtractRequest,
    user_id: CurrentUser,
    session: DbSession,
) -> ApiResponse[VoiceExtractResponse]:
    settings = get_settings()
    redis = await create_redis_pool(settings)
    try:
        item = await service.extract_voice_transcript(
            session,
            user_id,
            voice_log_id,
            transcript=body.transcript,
            redis=redis,
        )
    finally:
        await redis.close()
    return ok(item)


@router.post("/voice/process-anonymous", response_model=ApiResponse[AnonymousVoiceResult])
async def process_voice_anonymous(
    request: Request,
    file: Annotated[UploadFile, File()],
) -> ApiResponse[AnonymousVoiceResult]:
    settings = get_settings()
    stt = get_stt_provider(settings)
    llm = OpenRouterLLM(settings)
    redis = await create_redis_pool(settings)
    client_ip = request.client.host if request.client else "unknown"
    try:
        result = await service.process_anonymous_voice(file, stt, llm, redis, client_ip)
    finally:
        await redis.close()
    return ok(result)
