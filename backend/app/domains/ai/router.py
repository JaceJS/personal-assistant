"""AI assistant domain — chat endpoints."""

from __future__ import annotations

import json
from collections.abc import AsyncIterator

from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from app.ai.llm.openrouter import OpenRouterLLM
from app.core.auth import CurrentUser
from app.core.config import get_settings
from app.core.response import ApiResponse, ok
from app.domains.ai.schemas import ChatReply, ChatRequest

router = APIRouter(prefix="/ai", tags=["AI"])

_SYSTEM_PROMPT = (
    "You are a personal finance assistant for an Indonesian budgeting app. "
    "Your ONLY role is to help users with: tracking expenses, understanding budgets, "
    "managing accounts, and interpreting their financial data. "
    "If the user asks about anything outside personal finance, politely decline and "
    "redirect them to a finance-related question. "
    "Be concise. Respond in the same language the user uses (Indonesian or English)."
)


@router.post("/chat", response_model=ApiResponse[ChatReply])
async def chat(body: ChatRequest, _user_id: CurrentUser) -> ApiResponse[ChatReply]:
    settings = get_settings()
    llm = OpenRouterLLM(settings)
    reply = await llm.chat(_SYSTEM_PROMPT, body.message)
    return ok(ChatReply(reply=reply))


async def _sse_tokens(token_stream: AsyncIterator[str]) -> AsyncIterator[str]:
    async for token in token_stream:
        yield f"data: {json.dumps(token)}\n\n"
    yield "data: [DONE]\n\n"


@router.post("/chat/stream")
async def chat_stream(body: ChatRequest, _user_id: CurrentUser) -> StreamingResponse:
    settings = get_settings()
    llm = OpenRouterLLM(settings)
    return StreamingResponse(
        _sse_tokens(llm.stream_chat(_SYSTEM_PROMPT, body.message)),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
