# Backend — Claude Code Guide

> See root `AGENTS.md` for monorepo overview and cross-cutting security rules.

## Commands (run from `backend/`)
```bash
uv run uvicorn app.main:app --reload          # API server (port 8000)
uv run arq app.workers.voice_processor.WorkerSettings  # voice worker
uv run alembic upgrade head                   # apply DB migrations
uv run alembic revision --autogenerate -m "describe change"  # new migration
uv run pytest tests/unit/                     # unit tests (no DB/Redis needed)
uv run pytest                                 # full suite (needs docker compose up -d)
uv run ruff check . && uv run mypy app        # lint + types — run before every commit
uv run ruff format .                          # auto-format
```

---

## Architecture Pattern — Enforce Strictly

```
Router → Service → Repository → Model (ORM)
         ↑
       Schemas (Pydantic)
```

| Layer | Responsibility | Must NOT |
|-------|---------------|---------|
| **Router** | HTTP: extract params, call service, return response | Business logic, DB access |
| **Service** | Business logic, ownership checks, balance updates | Raise HTTP errors, call HTTP clients |
| **Repository** | Async SQL queries only | Check ownership, raise AppError |
| **Model** | SQLAlchemy ORM definition | Business methods |
| **Schemas** | Pydantic request/response validation | DB logic |

---

## API Response Standard

All endpoints return the same JSON envelope. No exceptions.

### Helpers (`app/core/response.py`)
```python
from app.core.response import ok, paginated

return ok(item)                                      # GET /{id}, POST, PATCH
return ok(item, message="created")                   # POST (201)
return paginated(items, total=total, limit=l, offset=o)  # paginated list
return paginated(items, total=len(items), limit=len(items), offset=0)  # non-paginated list
```
**NEVER** return raw ORM objects or plain dicts from a router.

### HTTP Status Codes
| Code | When |
|------|------|
| 200  | GET, PATCH — success |
| 201  | POST — resource created |
| 204  | DELETE — no body |
| 400  | Validation error |
| 401  | Unauthenticated |
| 403  | Forbidden (wrong owner) |
| 404  | Not found |
| 409  | Conflict |

---

## Authentication

```python
from app.core.auth import CurrentUser

@router.get("/resource/{id}")
async def get_resource(id: uuid.UUID, user_id: CurrentUser, session: DbSession):
    ...
```
- Every route **must** declare `user_id: CurrentUser`. No exceptions.
- `CurrentUser` verifies the Supabase JWT via JWKS (RS256) and returns the `user_id` UUID.
- Backend connects as `postgres` role → **RLS is bypassed**. Service-layer ownership checks are the only protection.

---

## Exception Handling

```python
from app.core.exceptions import NotFoundError, ForbiddenError, ConflictError

raise NotFoundError("Transaction not found")    # → 404
raise ForbiddenError("You don't own this")      # → 403
raise ConflictError("Name already taken")       # → 409
```
- Use specific subclasses. Never use `HTTPException` or generic `Exception`.
- Central handler in `app/core/exceptions.py` converts to the standard error envelope automatically.

---

## Ownership Pattern

```python
# Service layer — always check after loading
async def get_account_or_404(session, account_id, user_id):
    account = await repo.get_account(session, account_id)
    if account is None:
        raise NotFoundError(f"Account {account_id} not found")
    if account.user_id != user_id:
        raise ForbiddenError("You don't own this account")
    return account
```
- Every `get_*_or_404` that fetches by PK **must** check `user_id` (or document why it's safe).
- Categories exception: `user_id IS NULL` = system default readable by all; `user_id = X` = private.
- **NEVER** add ownership logic to repository functions.
- **NEVER** call `repo.*` directly from a router.

---

## Database Migrations

Always create a new Alembic revision for any schema change. Never edit existing migration files.

```bash
# After changing models.py:
uv run alembic revision --autogenerate -m "short_description"
uv run alembic upgrade head
```

### Database Conventions
- Primary keys: `UUID` (DB default)
- Timestamps: `created_at`, `updated_at` on every table (from `TimestampedBase`)
- Money: **BigInt** (integer rupiah/cents) — never float
- Soft delete: `is_archived: bool` — never hard-delete
- User scope: every table has `user_id: UUID`

---

## AI Knowledge & Guardrails

Prompts live co-located with their extractor, not in routers or workers:
- Chat: `app/domains/ai/router.py` — scope-restricted to finance only; refuses off-topic questions
- Voice extraction: `app/domains/finance/extractor.py`
- Receipt extraction: `app/domains/finance/receipt_extractor.py`

Rules for every new AI feature:
- Set `max_tokens` on `OpenRouterLLM(settings, max_tokens=N)` — never leave unbounded
- Validate input length at the schema layer (`Field(..., max_length=N)`)
- Extraction must raise `BadRequestError` if `confidence < CONFIDENCE_THRESHOLD` (0.4)
- Prompts must name scope explicitly: what the AI WILL and WON'T do

---

## AI Providers — Use Abstractions

```python
# GOOD
from app.ai.llm.base import LLMProvider
from app.ai.stt.base import STTProvider

# BAD — never import AI SDKs directly in domain code
import openai               # ❌
```
- STT and LLM models are configured via `STT_MODEL` and `LLM_MODEL` env vars — never hardcode model names.
- Structured extraction via `instructor` only — never parse raw LLM text.

---

## Adding a New Domain (journal, tasks, calendar)

1. Copy `app/domains/finance/` structure: `models.py`, `schemas.py`, `repository.py`, `service.py`, `router.py`
2. Register router in `app/main.py`
3. Add intent routing in `app/ai/intent_classifier.py`
4. `uv run alembic revision --autogenerate -m "add_<domain>_tables"`
5. `uv run alembic upgrade head`

---

## What NOT to Do

- **NEVER** call `repo.*` from a router
- **NEVER** put business logic or ownership checks in the repository layer
- **NEVER** rely on RLS for security (it's bypassed)
- **NEVER** hardcode model names, API keys, or URLs
- **NEVER** use `float` for money
- **NEVER** skip `CurrentUser` on any route
- **NEVER** return 200 for errors — use the exception classes
- **NEVER** add tables without an Alembic migration
- **NEVER** use `HTTPException` — use `AppError` subclasses
