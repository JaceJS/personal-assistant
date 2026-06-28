"""AI assistant domain, offering chat endpoints with conversation history and tool calling."""

from __future__ import annotations

import json
import uuid
from collections.abc import AsyncIterator
from typing import Annotated, Any

from fastapi import APIRouter, Depends, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.llm.openrouter import OpenRouterLLM
from app.core.auth import CurrentUser
from app.core.config import get_settings
from app.core.database import get_session
from app.core.rate_limit import per_user_rate_limit
from app.core.response import ApiResponse, ok
from app.domains.ai import repository as repo
from app.domains.ai import service
from app.domains.ai.schemas import (
    ChatMessageOut,
    ChatReply,
    ChatRequest,
    DailyInsight,
    DraftTransaction,
    SessionHistoryResponse,
)
from app.domains.ai.tools import TOOLS, execute_tool

router = APIRouter(prefix="/ai", tags=["AI"])

_AI_CHAT_LIMIT = per_user_rate_limit(60, 3600)
_AI_INSIGHT_LIMIT = per_user_rate_limit(30, 3600)

DbSession = Annotated[AsyncSession, Depends(get_session)]

_SYSTEM_PROMPT = (
    "You are a personal finance assistant for an Indonesian budgeting app. "
    "Your ONLY role is to help users with: tracking expenses, understanding budgets, "
    "managing accounts, and interpreting their financial data. "
    "When the user asks about their financial data, use the available tools to fetch "
    "real data before answering. Do not guess or make up numbers. "
    "You can also record new transactions for the user using the create_transaction tool. "
    "Always call get_accounts first to find a valid account_id before creating a transaction. "
    "After creating a draft transaction, tell the user to review and confirm it in the app. "
    "If the user asks about anything outside personal finance, politely decline and "
    "redirect them to a finance-related question. "
    "Be concise. Respond in the same language the user uses (Indonesian or English)."
)


@router.get("/sessions/{session_id}/messages", response_model=ApiResponse[SessionHistoryResponse])
async def get_session_messages(
    session_id: uuid.UUID,
    user_id: CurrentUser,
    session: DbSession,
) -> ApiResponse[SessionHistoryResponse]:
    msgs = await service.get_session_messages(user_id, session_id, session)
    return ok(
        SessionHistoryResponse(
            session_id=session_id,
            messages=[
                ChatMessageOut(id=m.id, role=m.role, content=m.content, created_at=m.created_at)
                for m in msgs
            ],
        )
    )


@router.get("/insight", response_model=ApiResponse[DailyInsight], dependencies=[_AI_INSIGHT_LIMIT])
async def get_daily_insight(
    request: Request, user_id: CurrentUser, session: DbSession
) -> ApiResponse[DailyInsight]:
    llm = OpenRouterLLM(get_settings(), max_tokens=150)
    result = await service.get_daily_insight(user_id, session, request.app.state.redis, llm)
    return ok(result)


@router.post("/chat", response_model=ApiResponse[ChatReply], dependencies=[_AI_CHAT_LIMIT])
async def chat(
    body: ChatRequest, user_id: CurrentUser, session: DbSession
) -> ApiResponse[ChatReply]:
    settings = get_settings()
    llm = OpenRouterLLM(settings, max_tokens=1000)

    chat_session = await repo.get_or_create_session(session, user_id, body.session_id)

    history = await repo.get_recent_messages(session, chat_session.id, limit=20)
    loop_messages: list[dict[str, Any]] = [{"role": m.role, "content": m.content} for m in history]

    await repo.add_message(session, chat_session.id, "user", body.message)
    loop_messages.append({"role": "user", "content": body.message})

    final_reply = ""
    draft_transaction: DraftTransaction | None = None
    for _ in range(3):
        content, tool_calls = await llm.chat_with_tools(_SYSTEM_PROMPT, loop_messages, TOOLS)
        final_reply = content

        if not tool_calls:
            break

        # Append assistant tool-call message so LLM sees what it requested
        loop_messages.append(
            {
                "role": "assistant",
                "content": None,
                "tool_calls": [
                    {
                        "id": tc["id"],
                        "type": "function",
                        "function": {
                            "name": tc["name"],
                            "arguments": json.dumps(tc["arguments"]),
                        },
                    }
                    for tc in tool_calls
                ],
            }
        )
        for tc in tool_calls:
            result = await execute_tool(tc["name"], tc["arguments"], user_id, session)
            loop_messages.append({"role": "tool", "tool_call_id": tc["id"], "content": result})
            if tc["name"] == "create_transaction":
                result_data = json.loads(result)
                if "transaction_id" in result_data:
                    draft_transaction = DraftTransaction(**result_data)

    await repo.add_message(session, chat_session.id, "assistant", final_reply)
    return ok(
        ChatReply(
            reply=final_reply,
            session_id=chat_session.id,
            draft_transaction=draft_transaction,
        )
    )


async def _sse_tokens(token_stream: AsyncIterator[str]) -> AsyncIterator[str]:
    async for token in token_stream:
        yield f"data: {json.dumps(token)}\n\n"
    yield "data: [DONE]\n\n"


@router.post("/chat/stream", dependencies=[_AI_CHAT_LIMIT])
async def chat_stream(body: ChatRequest, _user_id: CurrentUser) -> StreamingResponse:
    settings = get_settings()
    llm = OpenRouterLLM(settings, max_tokens=1000)
    return StreamingResponse(
        _sse_tokens(llm.stream_chat(_SYSTEM_PROMPT, body.message)),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
