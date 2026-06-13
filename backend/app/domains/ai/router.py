"""AI assistant domain — chat endpoint."""

from __future__ import annotations

from fastapi import APIRouter

from app.ai.llm.openrouter import OpenRouterLLM
from app.core.auth import CurrentUser
from app.core.config import get_settings
from app.core.response import ApiResponse, ok
from app.domains.ai.schemas import ChatReply, ChatRequest

router = APIRouter(prefix="/ai", tags=["AI"])

_SYSTEM_PROMPT = (
    "You are a personal finance assistant. "
    "Help the user track expenses, understand budgets, and manage accounts. "
    "Be concise and helpful."
)


@router.post("/chat", response_model=ApiResponse[ChatReply])
async def chat(body: ChatRequest, _user_id: CurrentUser) -> ApiResponse[ChatReply]:
    settings = get_settings()
    llm = OpenRouterLLM(settings)
    reply = await llm.chat(_SYSTEM_PROMPT, body.message)
    return ok(ChatReply(reply=reply))
