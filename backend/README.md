# Personal Assistant AI Backend

Backend for a personal assistant. Users speak or write things like:

1. "Bikin pengingat untuk beli kopi gocap besok jam 3 sore"
2. "Berapa uangku hari ini?"
3. "Tambah pengeluaran Rp 25.000 buat makan siang"

Semua di-parse pakai LLM, di-link ke database, lalu bisa diakses via Mobile.

The codebase is organised by **domain** (`app/domains/<domain>/`). Only the
**finance** domain is implemented now; `journal`, `tasks`, and `calendar` are
placeholders for later.

## Tech stack

| Concern        | Choice                                           |
| -------------- | ------------------------------------------------ |
| Language       | Python 3.12                                      |
| Framework      | FastAPI (async)                                  |
| Package mgr    | uv                                               |
| Database       | PostgreSQL 16 (Supabase) + SQLAlchemy 2.0 async  |
| Migrations     | Alembic                                          |
| Validation     | Pydantic v2                                      |
| Auth           | Supabase Auth (JWT verified on the backend)      |
| Job queue      | ARQ (Redis)                                      |
| Object storage | Cloudflare R2 (S3-compatible)                    |
| STT            | Groq Whisper (OpenAI-compatible API)             |
| LLM            | Groq Llama 3.3 70B, with a Claude fallback shape |
| Tests          | pytest + pytest-asyncio + httpx                  |
| Lint / types   | ruff + mypy (strict)                             |

## Prerequisites

- Python 3.12
- [uv](https://docs.astral.sh/uv/) — install per-user, no admin required:
  `python -m pip install --user uv`
- Docker + Docker Compose (for local Postgres and Redis)

## First-time setup

```bash
cd backend

# 1. Install dependencies into a project-local .venv
uv sync

# 2. Create your local environment file and fill in the secrets
cp .env.example .env        # Windows PowerShell: copy .env.example .env

# 3. Start Postgres 16 + Redis 7
docker compose up -d

# 4. Apply database migrations
uv run alembic upgrade head

# 5. (Optional) Seed the system-default categories
uv run python scripts/seed_data.py
```

## Running locally

```bash
# API server (http://localhost:8000, docs at /docs)
uv run uvicorn app.main:app --reload

# ARQ worker for the voice-processing pipeline (separate terminal)
uv run arq app.workers.voice_processor.WorkerSettings
```

`GET /health` needs no auth. All `/api/v1/*` endpoints require a Supabase JWT
in the `Authorization: Bearer <token>` header.

## Running tests

```bash
# Unit tests only (no services required)
uv run pytest tests/unit

# Full suite (needs `docker compose up -d` running first)
uv run pytest
```

Integration tests run against the `voice_finance_test` database, which the
Postgres container creates automatically on first startup.

## Linting and type-checking

```bash
uv run ruff check .
uv run ruff format .
uv run mypy app
```

## Creating a migration

```bash
# Autogenerate from model changes, then review the generated file by hand
uv run alembic revision --autogenerate -m "describe the change"
uv run alembic upgrade head
```

## Environment variables

See [.env.example](.env.example) for the full list. Key groups: app settings,
`DATABASE_URL`, Supabase keys, `REDIS_URL`, Cloudflare R2 credentials, and AI
provider keys (`GROQ_API_KEY`, `ANTHROPIC_API_KEY`) plus the `STT_PROVIDER` /
`LLM_PROVIDER` selectors.

## Project layout

```
app/
  core/      config, database, auth, exceptions, logging
  ai/        STT + LLM provider abstractions (swappable), intent classifier
  shared/    base model, R2 storage client, ARQ queue setup
  domains/   one self-contained package per domain (finance implemented)
  workers/   ARQ workers (voice processing pipeline)
alembic/     migrations
tests/       unit + integration
scripts/     seed data, db init
```

## Notes

- `users` are owned by Supabase Auth; this backend only stores `user_id` (UUID).
- Row-Level Security policies are applied via the initial migration but only on
  databases that have Supabase's `auth` schema (a no-op on plain local Postgres).
- AI providers are always used through the `ai/` interfaces — never import a
  provider SDK directly from domain code.
