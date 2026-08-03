import uuid
from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, File, Form, UploadFile

from app.core.auth import CurrentUser
from app.core.config import get_settings
from app.core.rate_limit import per_user_rate_limit
from app.core.response import ApiResponse, ok
from app.domains.finance import service
from app.domains.finance.routers.deps import DbSession
from app.domains.finance.schemas import (
    VoiceExtractRequest,
    VoiceExtractResponse,
    VoiceStatusRead,
    VoiceUploadResponse,
)
from app.shared.storage import R2Storage

router = APIRouter(tags=["Voice"])

_VOICE_LIMIT = per_user_rate_limit("voice_upload", 60, 3600)
_VOICE_EXTRACT_LIMIT = per_user_rate_limit("voice_extract", 30, 3600)


@router.post(
    "/voice/upload",
    response_model=ApiResponse[VoiceUploadResponse],
    status_code=201,
    dependencies=[_VOICE_LIMIT],
)
async def upload_voice(
    user_id: CurrentUser,
    session: DbSession,
    background_tasks: BackgroundTasks,
    account_id: Annotated[uuid.UUID, Form()],
    file: Annotated[UploadFile, File()],
    chat_session_id: Annotated[uuid.UUID | None, Form()] = None,
) -> ApiResponse[VoiceUploadResponse]:
    item = await service.create_voice_upload(
        session,
        user_id,
        account_id=account_id,
        file=file,
        storage=R2Storage(get_settings()),
        background_tasks=background_tasks,
        chat_session_id=chat_session_id,
    )
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
    dependencies=[_VOICE_EXTRACT_LIMIT],
)
async def extract_voice(
    voice_log_id: uuid.UUID,
    body: VoiceExtractRequest,
    user_id: CurrentUser,
    session: DbSession,
    background_tasks: BackgroundTasks,
) -> ApiResponse[VoiceExtractResponse]:
    item = await service.extract_voice_transcript(
        session,
        user_id,
        voice_log_id,
        transcript=body.transcript,
        background_tasks=background_tasks,
        chat_session_id=body.chat_session_id,
    )
    return ok(item)
