# Personal Assistant - Monorepo Guide

## What This App Is

AI-powered personal assistant starting with a **finance wedge** (budgeting, accounts, voice
transactions). Vision: expand to journaling, events, and daily routine management. Target market:
Indonesia-first, English UI, global-ready. Tech stack: Expo React Native + FastAPI + PostgreSQL
(Supabase) + Cloudflare R2.

## Product Docs (baca sebelum mengubah scope/flow)

- `docs/PRD.md` — visi, non-goals, metrik, roadmap. Semua keputusan fitur tunduk ke sini.
- `docs/USER_FLOWS.md` — peta route & alur produk (capture 4 kanal, system flows, matriks guest,
  spesifikasi event analytics). **Wajib di-update di PR yang sama** saat menambah/mengubah layar,
  navigasi, atau alur data user.

## Monorepo Layout

```
/
├── backend/          # FastAPI API (Python 3.12)
│   └── AGENTS.md     # Backend-specific patterns and commands
├── mobile/           # Expo React Native app (SDK 54)
│   └── AGENTS.md     # Mobile-specific patterns and commands
├── web/              # Next.js marketing site: landing + privacy + terms (Vercel)
└── docker-compose.yml  # Local dev: Postgres (5433)
```

Each subdirectory has its own AGENTS.md (read those when working inside them).

## SDK & Package Versioning (CRITICAL)

Mobile uses **Expo SDK 54**. Installing packages built for a newer SDK causes native crashes (`ClassNotFoundException`).

- **ALWAYS use `npx expo install <pkg>`** when adding/updating native packages in `mobile/` (never `npm install`).
- After any native change: `npx expo install --fix` to re-align all packages.
- Never manually pin an `expo-*` or `react-native-*` package to a version higher than what `npx expo install` resolves.
- When in doubt, check: `node -e "console.log(require('./node_modules/expo/package.json').version)"` (should be `~54.x.x`).

---

## Dev Environment Quick-Start

```bash
# 1. Start infra (from repo root)
docker compose up -d

# 2. Backend API (from backend/)
uv run uvicorn app.main:app --reload       # http://localhost:8000

# 3. Mobile (from mobile/)
npm run android   # or ios / start
```

## Production Infra

- **Backend:** Fly.io app `savyn-api` (region `sin`), single `app` process (uvicorn, HTTP).
  Config in `backend/fly.toml`. Health check: `https://savyn-api.fly.dev/health`.
- **Database:** Supabase Postgres prod, reached through the PgBouncer pooler (see
  `backend/AGENTS.md` § Database Migrations for the `statement_cache_size=0` requirement).
- **Deploy:** `flyctl deploy -a savyn-api` from `backend/` (rebuilds the image — `flyctl secrets
  set` alone only re-releases the *existing* image, it does not rebuild).
- **Mobile → prod backend:** EAS builds get `EXPO_PUBLIC_API_URL=https://savyn-api.fly.dev`
  from the `env` blocks in `mobile/eas.json` (`.env` is gitignored and never uploaded).
  `mobile/.env` only drives local dev — see `mobile/AGENTS.md` § 0 for the full env matrix.
- **Web (marketing + legal):** Next.js in `web/`, deployed on Vercel with **Root Directory =
  `web`** (auto CI/CD on push; enable "skip builds when Root Directory unchanged"). Site facts
  (domain, support email, Play Store URL) live in `web/lib/site.ts`; override the domain via
  `NEXT_PUBLIC_SITE_URL`. The privacy/terms URLs in
  `mobile/app/(app)/(tabs)/settings/index.tsx` must point at this site's `/privacy` & `/terms`.

## Architecture: How the Two Sides Connect

```
Mobile (Expo RN)
  ├── Supabase JS ──── auth only (sign in, sign out, token refresh)
  └── apiFetch() ──── Bearer <Supabase JWT> ──► FastAPI
                                                 ├── JWKS-verifies JWT
                                                 ├── extracts user_id
                                                 └── all data ops (accounts, transactions, etc.)
```

**Critical rules:**

- Supabase is **auth only**. All data goes through FastAPI.
- Mobile never calls Supabase REST/realtime for finance data.
- JWT is attached automatically in `mobile/src/lib/api/client.ts`.

## AI Pipeline (Voice Transactions)

```
Mobile mic → POST /api/v1/voice/upload → R2 (audio stored)
                                        → BackgroundTask scheduled
Background job → OpenRouter STT → OpenRouter LLM (extraction) → draft Transaction saved
Mobile polls → GET /api/v1/voice/{id} → completed → shows draft for user confirmation
```

## Security Rules (Apply Everywhere)

- Every FastAPI route **must** declare `user_id: CurrentUser` dependency.
- Every single-resource-by-ID fetch **must** check `record.user_id == user_id` after loading.
- The backend connects as the `postgres` role → **RLS is bypassed**. API-layer checks are the only protection.
- **NEVER** use mock data, fake responses, or skip auth in any environment.
- **NEVER** log tokens, JWTs, passwords, or user financial data.
- **NEVER** hardcode secrets (all config via environment variables under `backend/.env`).

## Database

- PostgreSQL 16 via Supabase (prod) or Docker (dev, port 5433).
- Migrations: Alembic. Run `uv run alembic upgrade head` after pulling.
- Tables: `accounts`, `categories`, `transactions`, `voice_logs`, `budgets` (all scoped by `user_id`).
- Money stored as **BigInt (integer cents/rupiah)** (never floats).

## Environment Variables

Copy `backend/.env.example` → `backend/.env` and `mobile/.env.example` → `mobile/.env`.
Backend key vars: `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
`R2_*`, `OPENROUTER_API_KEY`, `STT_MODEL`, `LLM_MODEL`, `RECEIPT_MODEL`. Mobile key vars:
`EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`.

## Codebase Exploration (Use the Knowledge Graph First)

A knowledge graph of this project lives in `graphify-out/`. Query it **before** broad file
exploration; it's faster and uses fewer tokens than scanning source files directly.

```bash
# Run from repo root (requires graphifyy: pipx install graphifyy)
graphify query "how does voice processing work"    # broad architectural context
graphify path "VoiceLog" "Transaction"             # trace a dependency chain
graphify explain "R2Storage"                       # understand a specific node
```

Key artifacts:
- `graphify-out/GRAPH_REPORT.md` (architecture audit, god nodes, community breakdown)
- `graphify-out/graph.json` (raw graph for programmatic access)

After significant code changes, refresh the graph: `/graphify --update` in Claude Code.

## Domain Status

| Domain                                   | Backend        | Mobile         |
| ---------------------------------------- | -------------- | -------------- |
| Finance (accounts, transactions, budget) | ✅ Implemented | ✅ Implemented |
| Journal                                  | 🚧 Stub only   | 🚧 Stub only   |
| Tasks                                    | 🚧 Stub only   | -              |
| Calendar                                 | 🚧 Stub only   | -              |

When adding a new domain, follow the finance domain as the template exactly.

## Testing

All complex business logic (backend/Python and mobile/TypeScript) must follow **Test-Driven Development**: write a failing test first, then implement. See `mobile/AGENTS.md` section 15 for mobile test setup, file conventions, and what must be covered.
