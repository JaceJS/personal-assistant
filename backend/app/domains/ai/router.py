"""AI assistant domain, offering chat endpoints with conversation history and tool calling."""

from __future__ import annotations

import json
import re
import uuid
from typing import Annotated, Any

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.llm.openrouter import OpenRouterLLM
from app.core.auth import CurrentUser
from app.core.config import get_settings
from app.core.database import get_session
from app.core.rate_limit import per_user_rate_limit
from app.core.response import ApiResponse, ok
from app.domains.ai import repository as repo
from app.domains.ai import service
from app.domains.ai.prompts import CHAT_BEHAVIOR_RULES, TONE_RULES
from app.domains.ai.schemas import (
    ChatMessageOut,
    ChatReply,
    ChatRequest,
    DailyInsight,
    DraftTransaction,
    SessionHistoryResponse,
)
from app.domains.ai.tools import TOOLS, execute_tool
from app.domains.finance import repository as finance_repo
from app.domains.finance.models import CategoryType

router = APIRouter(prefix="/ai", tags=["AI"])

_AI_CHAT_LIMIT = per_user_rate_limit("ai_chat", 60, 3600)
_AI_INSIGHT_LIMIT = per_user_rate_limit("ai_insight", 30, 3600)

_MAX_TOOL_ITERATIONS = 5
_FALLBACK_REPLY = "Maaf, aku belum bisa jawab itu sekarang. Coba tanya lagi dengan cara lain ya."
_INCOMPLETE_ACTION_NOTICE = (
    "You were unable to finish gathering data or completing the requested action within "
    "this turn. Tell the user honestly that you couldn't finish — never claim success or "
    "state a number/fact that wasn't confirmed by a tool result."
)
_PENDING_DRAFTS_NOTICE_TEMPLATE = (
    "You already recorded these draft transactions earlier in this chat session — do NOT "
    "call create_transaction for them again unless the user explicitly asks you to: {items}"
)
_EMPTY_ASSISTANT_TURN_PLACEHOLDER = "(action completed — see the draft card shown in the chat)"
_CATEGORY_LIST_TEMPLATE = (
    "These are the user's transaction categories. When calling create_transaction, "
    "category_name MUST be one of these names copied EXACTLY — never invent or translate "
    "a name. Pick the closest match for what the money was for (e.g. 'makan siang' -> "
    "'Makan & Jajan', 'ojek' -> 'Ojek & Transport').\n"
    "Expense categories: {expense}\n"
    "Income categories: {income}"
)

DbSession = Annotated[AsyncSession, Depends(get_session)]

# Ceiling on create_transaction calls per turn, derived from how many amounts
# the user actually typed — not a real amount parser, just a guess-blocker:
# 0 mentions means 0 drafts are possible no matter what the model tries.
_AMOUNT_MENTION_PATTERN = re.compile(r"\d[\d.,]*\s*(?:rb|ribu|k|jt|juta)?", re.IGNORECASE)


def _count_amount_mentions(message: str) -> int:
    return len(_AMOUNT_MENTION_PATTERN.findall(message))


_SYSTEM_PROMPT = (
    "You are a personal finance assistant for an Indonesian budgeting app. "
    "Your ONLY role is to help users with: tracking expenses, understanding budgets, "
    "managing accounts, and interpreting their financial data. "
    "When the user asks about their financial data, use the available tools to fetch "
    "real data before answering. Never guess, estimate, or invent a number. If a tool "
    "returns an error or the data isn't available, tell the user honestly you don't have "
    "that information right now instead of answering anyway. "
    "You can also record new transactions for the user using the create_transaction tool. "
    "Always call get_accounts first to find a valid account_id before creating a transaction. "
    "When the user sends items in the shorthand format '<name> <price>' (e.g. 'sate 20.000' "
    "or 'kopi 15rb'), treat each item as an expense to record immediately: call "
    "create_transaction once per item without asking follow-up questions. "
    "Indonesian number format: dots are thousand separators ('20.000' = 20000 rupiah, "
    "'15rb'/'15k' = 15000). Expenses are negative amounts. "
    "category_name is the important field — always pick the closest matching category for "
    "what the money was for. merchant is optional: only set it if the user names an actual "
    "merchant, store, or payee; if they only describe the purpose (e.g. 'makan siang', 'gaji "
    "bulan ini'), leave merchant unset and rely on category_name instead. "
    "If the user lists multiple items in one message, create one draft per item. "
    "Do NOT call create_transaction on a guess. It requires both a specific amount AND a "
    "clear purpose to match a category to, taken from the user's own words. If the user only "
    "says something generic like 'catat pengeluaran' or 'catat pemasukan' with no purpose or "
    "amount, call no tool for it at all — reply with a short question asking what it was for "
    "and how much. "
    "This is the one exception to the 'answer first, ask second' rule below: a missing "
    "account can default to the user's main account, a missing purpose or amount cannot. "
    "After successfully calling create_transaction, do not add any confirmation text — the "
    "app already shows a review card for each draft, so a text reply would be redundant. "
    "Only reply with text if you could NOT create a transaction the user asked for (e.g. "
    "invalid account, unclear item) — explain briefly what went wrong. "
    "Never say a transaction was recorded, saved, or dicatat unless create_transaction "
    "actually returned a transaction_id in a tool result earlier THIS turn — saying so "
    "without that is a critical error, since the user will believe money was tracked when "
    "it wasn't. "
    "If the user asks about anything outside personal finance, politely decline and "
    "redirect them to a finance-related question. "
    f"{TONE_RULES} {CHAT_BEHAVIOR_RULES}"
)


@router.get("/sessions/{session_id}/messages", response_model=ApiResponse[SessionHistoryResponse])
async def get_session_messages(
    session_id: uuid.UUID,
    user_id: CurrentUser,
    session: DbSession,
) -> ApiResponse[SessionHistoryResponse]:
    msgs, draft_transactions = await service.get_session_messages(user_id, session_id, session)
    return ok(
        SessionHistoryResponse(
            session_id=session_id,
            messages=[
                ChatMessageOut(id=m.id, role=m.role, content=m.content, created_at=m.created_at)
                for m in msgs
            ],
            draft_transactions=draft_transactions,
        )
    )


@router.get("/insight", response_model=ApiResponse[DailyInsight], dependencies=[_AI_INSIGHT_LIMIT])
async def get_daily_insight(
    user_id: CurrentUser, session: DbSession
) -> ApiResponse[DailyInsight]:
    llm = OpenRouterLLM(get_settings(), max_tokens=150)
    result = await service.get_daily_insight(user_id, session, llm)
    return ok(result)


@router.post("/chat", response_model=ApiResponse[ChatReply], dependencies=[_AI_CHAT_LIMIT])
async def chat(
    body: ChatRequest, user_id: CurrentUser, session: DbSession
) -> ApiResponse[ChatReply]:
    settings = get_settings()
    llm = OpenRouterLLM(settings, max_tokens=1000)

    chat_session = await repo.get_or_create_session(session, user_id, body.session_id)

    history = await repo.get_recent_messages(session, chat_session.id, limit=20)
    # A bare empty assistant turn (the "no filler text" behavior below, for a
    # successful create_transaction) reads to the model as "I never actually
    # responded to that" — it then re-attempts the earlier item on the next
    # message. Substituting a placeholder only for what's replayed to the LLM
    # this turn fixes that without touching what's persisted or shown in the UI.
    loop_messages: list[dict[str, Any]] = [
        {"role": m.role, "content": m.content or _EMPTY_ASSISTANT_TURN_PLACEHOLDER} for m in history
    ]

    # Tool calls/results aren't persisted to chat_messages (only user/assistant text
    # is), and a successful create_transaction now leaves an empty assistant reply
    # (see the "no filler text" behavior below) — so without this, the model has no
    # record it already handled an earlier item and will re-create it alongside a
    # new one. Reading live from the DB also means a draft the user since cancelled
    # (deleted) naturally drops out on its own.
    #
    # This is folded into the leading system prompt rather than appended as a
    # mid-conversation system message: empirically, this model complies with
    # instructions in the leading system prompt far more reliably than with a
    # system-role message buried between tool turns, which it tends to ignore.
    system_prompt = _SYSTEM_PROMPT

    # The model can only fill category_name correctly if it knows the user's
    # actual category names — without this list it guesses ("Makan") and the
    # backend ilike match fails silently, leaving drafts uncategorized.
    categories = await finance_repo.list_categories(session, user_id)
    if not categories:
        # Brand-new user before any screen triggered per-user seeding.
        categories = await finance_repo.list_system_categories(session)
    if categories:
        expense_names = ", ".join(c.name for c in categories if c.type == CategoryType.expense)
        income_names = ", ".join(c.name for c in categories if c.type == CategoryType.income)
        system_prompt += "\n\n" + _CATEGORY_LIST_TEMPLATE.format(
            expense=expense_names or "-", income=income_names or "-"
        )

    pending_drafts = await finance_repo.get_pending_draft_transactions(session, chat_session.id)
    if pending_drafts:
        items = ", ".join(f"{tx.merchant or 'item'} (Rp{abs(tx.amount)})" for tx in pending_drafts)
        system_prompt += "\n\n" + _PENDING_DRAFTS_NOTICE_TEMPLATE.format(items=items)

    await repo.add_message(session, chat_session.id, "user", body.message)
    loop_messages.append({"role": "user", "content": body.message})

    final_reply = ""
    draft_transactions: list[DraftTransaction] = []
    max_drafts = _count_amount_mentions(body.message)
    for i in range(_MAX_TOOL_ITERATIONS):
        # tool_choice="auto" lets the model skip tool-calling entirely and answer
        # straight from the system prompt's script (e.g. claim a transaction was
        # recorded with zero grounding). Forcing iteration 0 alone wasn't enough in
        # practice: the model would call get_accounts (satisfying that one forced
        # call), then bail to freeform text on iteration 1 without ever calling
        # create_transaction. Forcing 0 and 1 both closes that — in the observed
        # get_accounts -> create_transaction ordering, iteration 1 is exactly the
        # call that needs to still be required.
        content, tool_calls = await llm.chat_with_tools(
            system_prompt, loop_messages, TOOLS, require_tool=(i < 2)
        )
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
            if tc["name"] == "create_transaction" and len(draft_transactions) >= max_drafts:
                # The user's message didn't mention enough amounts to justify
                # another draft — block it in code rather than trust the model
                # to have followed the "don't guess" prompt instruction.
                result = json.dumps(
                    {
                        "error": (
                            "No amount left unaccounted for in the user's message. Ask what "
                            "it was for and how much instead of guessing another one."
                        )
                    }
                )
            else:
                result = await execute_tool(
                    tc["name"], tc["arguments"], user_id, session, chat_session_id=chat_session.id
                )
            loop_messages.append({"role": "tool", "tool_call_id": tc["id"], "content": result})
            if tc["name"] == "create_transaction":
                result_data = json.loads(result)
                # Feedback for the model only, not part of the draft schema.
                result_data.pop("category_warning", None)
                if "transaction_id" in result_data:
                    draft_transactions.append(DraftTransaction(**result_data))

    if draft_transactions:
        # The draft card(s) are the confirmation; discard any text the model
        # wrote (even instructed not to write it, models don't always comply).
        final_reply = ""
    else:
        if not final_reply.strip():
            # Either the tool loop was exhausted with tool_calls still pending, or
            # the model returned truly empty content. Force one more completion
            # with tool calling disabled so the user always gets a text reply,
            # primed to admit it didn't finish rather than claim it did.
            final_reply, _ = await llm.chat_with_tools(
                system_prompt + "\n\n" + _INCOMPLETE_ACTION_NOTICE,
                loop_messages,
                TOOLS,
                force_text=True,
            )
        final_reply = final_reply.strip() or _FALLBACK_REPLY

    await repo.add_message(session, chat_session.id, "assistant", final_reply)
    return ok(
        ChatReply(
            reply=final_reply,
            session_id=chat_session.id,
            draft_transactions=draft_transactions,
        )
    )
