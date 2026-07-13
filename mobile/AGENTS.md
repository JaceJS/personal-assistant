# Mobile - Developer Guide

> See root `CLAUDE.md` for monorepo overview and security rules.

## Commands (run from `mobile/`)

```bash
npm run android     # build & run on Android
npm run ios         # build & run on iOS
npm start           # Expo dev server (Expo Go compatible features only)
npm run lint        # ESLint
npm run gen:api     # regenerate TypeScript types from OpenAPI schema
npm test            # run Jest test suite
```

> Adding a new native module requires rebuilding the dev client: `npm run android` or `npm run ios`.

---

# 0. ENVIRONMENTS & BUILDS (READ BEFORE ANY BUILD)

One repo, three build environments. Two independent axes: **where env vars come from** and **which keystore signs the APK**.

| Environment | Build command | Env vars source | API target | Signing keystore |
| --- | --- | --- | --- | --- |
| Local dev | `npx expo run:android` | `mobile/.env` (gitignored) | `http://10.0.2.2:8000` | Debug keystore (`~/.android/debug.keystore`) |
| Preview (APK, install di HP) | `eas build -p android --profile preview` | `eas.json` → `build.preview.env` | `https://savyn-api.fly.dev` | EAS-managed keystore |
| Production (AAB, Play Store) | `eas build -p android --profile production` | `eas.json` → `build.production.env` | `https://savyn-api.fly.dev` | EAS keystore → Google Play App Signing re-signs |

Rules:

- **`.env` is NOT uploaded to EAS builds** (gitignored). Every `EXPO_PUBLIC_*` var the app needs MUST also exist in the `env` block of each `eas.json` profile. When adding a new `EXPO_PUBLIC_*` var, update all three places: `.env`, `.env.example`, and both `eas.json` env blocks.
- **Google Sign-In**: `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` (the *web* client) is the same across all environments and never changes. What differs per environment is the **Android OAuth client** in Google Cloud Console (project `566473915571`): one client per (package `com.salendah_labs.savyn` + SHA-1) pair. Registered SHA-1s: debug keystore (local), EAS keystore (preview/production APK), and later Play App Signing (from Play Console). `DEVELOPER_ERROR` code 10 at login = the SHA-1 that signed the installed APK is not registered. Definitive check: `apksigner verify --print-certs <apk>`.
- **Sentry**: `SENTRY_DISABLE_AUTO_UPLOAD=true` is set in all EAS profiles because no Sentry org/project/auth token is configured yet. When enabling Sentry for real: remove that flag and set `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN` as EAS secrets.
- **Preview/production share the prod backend + Supabase.** Acceptable pre-launch; a separate staging backend + Supabase project is a pre-launch TODO.
- `mobile/android/` and `mobile/ios/` are gitignored; EAS regenerates them from `app.json` on every build. After changing `app.json` native config, refresh local folders with `npx expo prebuild -p android --clean` before the next local build.
- `mobile/patches/` (patch-package) is applied by `postinstall` both locally and on EAS. Current patch: `@supabase/supabase-js` — replaces a dynamic `import()` of optional OpenTelemetry that Hermes cannot compile. Re-check on every supabase-js upgrade.

---

# 1. THE PLATFORM: EXPO SDK 54

- Expo managed workflow, **SDK 54**. Read https://docs.expo.dev/versions/v54.0.0/ before writing code.
- Use Expo modules (`expo-router`, `expo-audio`, `expo-image-picker`, etc.) instead of bare RN equivalents.
- **ALWAYS add/update native packages with `npx expo install <pkg>` (NEVER `npm install`).** This resolves the version compatible with SDK 54 from Expo's registry. Installing a package built for a newer SDK (e.g. expo-sqlite 56.x on SDK 54) causes `ClassNotFoundException` native crashes.
- After any native dependency change, run `npx expo install --fix` to align all packages.
- Do NOT run `pod install`, `gradlew`, or native build commands manually.

---

# 2. NAVIGATION

- File-system routing via `expo-router`. Routes map to files under `app/`.
- Use `useRouter()` from `"expo-router"` to navigate. Never use `react-navigation` directly.
- **Bug known:** Never use `/index` suffix in `router.push()` when a folder has both `index.tsx` and `[id].tsx`. Use the folder path: `router.push('/(app)/accounts')` not `/(app)/accounts/index`, since doing so passes `"index"` as `[id]`, which causes an API 422 UUID error.
- Tab navigation: `<Tabs>` from `"expo-router"`. Custom tab bar: `FloatingTabBar` in `src/components/ui/FloatingTabBar.tsx`.
- Protected routes in `app/(app)/`. Auth routes in `app/(auth)/`.

---

# 3. DATA LAYER (NO MOCKING)

- **Supabase = auth only** (sign in, sign out, token refresh via `src/lib/supabase.ts`).
- **FastAPI = all data** (accounts, transactions, categories, budget, voice). Use `apiFetch()` from `src/lib/api/client.ts` (it attaches the Supabase JWT automatically).
- NEVER call Supabase REST/realtime for finance data.
- NEVER use mock data, mock API clients, or fake responses.
- Use TanStack Query for all server state. Query hooks live in `src/features/finance/hooks/`.
- Always handle loading, error, and empty states.

---

# 4. STATE MANAGEMENT

- **Zustand** for global client state (`src/stores/`): `auth`, `toast`, `recording`, `onboarding`.
- **TanStack Query** for server state (default `staleTime: 5min`).
- Keep Zustand stores flat. Persist only what survives app restarts (`onboarding`, session).
- Do NOT store server data in Zustand.

---

# 5. THEME & STYLING

Use **React Native StyleSheet** with design tokens (not Tailwind utility classes).

```typescript
import { colors, radius, spacing, textStyles } from "@/theme";
```

| Token        | File                      | Values                                                                      |
| ------------ | ------------------------- | --------------------------------------------------------------------------- |
| `colors`     | `src/theme/colors.ts`     | `bg.canvas` `bg.surface` `bg.elevated` `accent.primary` `text.primary` ... |
| `spacing`    | `src/theme/spacing.ts`    | `xs(4)` `sm(8)` `md(12)` `lg(16)` `xl(20)` `2xl(24)` `3xl(32)`             |
| `radius`     | `src/theme/radius.ts`     | `sm(6)` `md(10)` `lg(14)` `xl(20)` `full(999)`                             |
| `textStyles` | `src/theme/typography.ts` | See Typography section below                                                |

Key colors: `bg.canvas` `#FBF5EC` · `bg.surface` `#F3E9D8` · `accent.primary` `#E27A3F` · `text.primary` `#201810` · `text.muted` `#A79878`

---

# 6. TYPOGRAPHY SYSTEM

Font family: **Plus Jakarta Sans** (loaded via Expo Font).

| Style                 | Size | Weight | Notes                               |
| --------------------- | ---- | ------ | ----------------------------------- |
| `textStyles.display`  | 32   | 700    | Large hero numbers                  |
| `textStyles.h1`       | 24   | 700    | Page titles                         |
| `textStyles.h2`       | 18   | 600    | Section headings                    |
| `textStyles.h3`       | 15   | 600    | Card titles, menu labels            |
| `textStyles.body`     | 15   | 400    | Body text                           |
| `textStyles.caption`  | 12   | 400    | Secondary labels, currency          |
| `textStyles.overline` | 11   | 500    | Section labels (uppercase, tracked) |

Rules:
- **NEVER** write raw `fontFamily` strings.
- **NEVER** write `fontWeight` without spreading a `textStyles.*` base.
- Spread the closest base, then override only what's different: `{ ...StyleSheet.flatten(textStyles.h2), color: colors.accent.primary }`
- For tappable UI, keep visual styles (background, border, radius) on inner `<View>`; use `<Pressable>` only as interaction wrapper.

---

# 7. COMPONENTS

```
src/components/layout/
  Header.tsx       - screen header with title + optional back/right actions
  Screen.tsx       - SafeAreaView wrapper for full-screen layouts

src/components/ui/
  Button.tsx       - primary / secondary / ghost / danger variants
  Card.tsx         - default / elevated / accent variants
  Badge.tsx        - success / warning / danger / info
  Input.tsx        - text field with label + error
  EmptyState.tsx   - icon + title + subtitle + optional action
  Skeleton.tsx / SkeletonList.tsx - loading placeholders
  Toast.tsx        - managed via useToastStore
  FloatingTabBar.tsx - custom pill tab bar with central Mic FAB
```

- Use `<Screen>` + `<Header>` on every full screen. Never roll your own SafeAreaView + header.
- Use `useToastStore().showToast(message, type)` for user-facing feedback.
- **Never define domain components inline in screens** (extract to `src/features/<domain>/components/`).

---

# 8. FILE NAMING & LOCATION

```
app/(app)/                          - screen files (routes)
src/components/ui/                  - reusable UI components
src/components/layout/              - layout wrappers
src/features/<domain>/
  api/                              - apiFetch() wrappers
  components/                       - domain-specific components
  hooks/                            - TanStack Query hooks
  types.ts / constants.ts
src/hooks/                          - cross-domain hooks
src/lib/                            - utilities, clients (api, supabase, queryClient)
src/stores/                         - Zustand stores
src/theme/                          - design tokens
```

---

# 9. ERROR HANDLING & PERFORMANCE

- Use `useToastStore().showToast(msg, 'error')` for non-critical API errors.
- Never show raw error messages or stack traces to users.
- Always provide fallback values: `user?.email ?? ''`, `data?.items ?? []`.
- Memoize callbacks with `useCallback`, derived values with `useMemo`.
- `renderItem` in any FlatList must be `useCallback`.
- Use `SkeletonList` for loading states, never a spinner for data fetches.

---

# 10. CODE QUALITY

- TypeScript for all new code. No `any` without a comment explaining why.
- No inline styles for anything that might repeat; extract to `StyleSheet.create`.
- Small, focused components. If a component needs "and" to describe it, split it.
- No comments that restate the code. Comment only non-obvious WHY.

---

# 11. WHAT NOT TO DO

- **NEVER** use `npm install` for expo-* or react-native packages (use `npx expo install`)
- **NEVER** manually pin an expo package to a version higher than what `npx expo install` resolves for SDK 54
- **NEVER** call Supabase REST for data (use FastAPI via `apiFetch()`)
- **NEVER** call `apiFetch()` directly from a screen (all API calls go in `src/features/<domain>/hooks/`)
- **NEVER** use mock data or fake API responses
- **NEVER** write raw `fontFamily` strings (use `textStyles.*`)
- **NEVER** use `router.push('/(app)/accounts/index')` (use `'/(app)/accounts'`)
- **NEVER** use `react-navigation` components (only `expo-router`)
- **NEVER** use float for money (amounts are integer rupiah from the API)
- **NEVER** skip loading/error/empty states on any data-fetching screen
- **NEVER** write implementation before the test for complex logic (TDD required)
- **NEVER** define domain components inline in screen files

---

# 12. TESTING (TDD REQUIRED)

Write failing test first, then implement. Required for: utility/pure functions, navigation logic, bug fixes, new hooks with non-trivial state, components with conditional rendering driven by data.

```bash
npm test                  # run all tests
npm test -- <pattern>     # run matching files
```

Test runner: `jest-expo`. Assertions: `@testing-library/jest-native`. Component rendering: `@testing-library/react-native`.

File conventions:
- `src/features/<domain>/utils/__tests__/<name>.test.ts` - pure function tests
- `src/components/ui/__tests__/<name>.test.tsx` - component tests

Cover: pure utility functions, navigation handlers, data aggregation. Skip: StyleSheet rules, layout dimensions, trivial one-liners.

---

# 13. AUTH-GATED FEATURES

All routes under `app/(app)/` require an authenticated session. Guest users (`isGuest: true`) can land here if they previously completed onboarding but signed out, since the route group has no hard redirect guard.

**Rule: any TanStack Query hook that calls `apiFetch()` directly (no offline/local fallback) MUST include `enabled: initialized && !isGuest`** to prevent cold-start race conditions and unnecessary 401s.

```typescript
// Pattern for hooks with NO local repository fallback
const { initialized, isGuest } = useAuthStore();
return useQuery({
  ...
  enabled: initialized && !isGuest,
});
```

**Exception: finance-domain hooks routed through `useFinanceRepository()`** (`useAccounts`, `useTransactions`, `useCategories`, `useBudget`, etc.): these swap to `LocalRepository` (offline SQLite, no JWT) when `isGuest` is true, so there is no 401 risk for guests. Gate these with `enabled: initialized` only; do NOT add `&& !isGuest`, or guest reads will be permanently disabled even though local writes succeed (this was a real bug: guest could create accounts/transactions/budget locally but the dashboard never showed them back).

| Feature | Endpoint | Requires auth |
|---------|----------|--------------|
| AI Insight card (home) | `GET /ai/insight` | ✅ Yes: reads financial summary |
| AI Chat | `POST /ai/chat` | ✅ Yes: reads + writes financial data |
| Chat history | `GET /ai/sessions/{id}/messages` | ✅ Yes: reads personal chat history |
| Accounts list | `GET /accounts` (guest: local SQLite) | Guest OK via local repo |
| Transactions | `GET /transactions` (guest: local SQLite) | Guest OK via local repo |
| Budget | `GET /budgets` (guest: local SQLite) | Guest OK via local repo |
| Voice upload | `POST /voice/upload` | ✅ Yes |

No endpoint in this app is public. Every route on the backend uses `CurrentUser` dependency.

---

# 14. INTERNATIONALIZATION (i18n)

The app ships in **Indonesian (`id`, default) and English (`en`)**, via `i18next` + `react-i18next`. Default language follows the device locale (`id` device → `id`, anything else → `en`); user can override in Profil → Bahasa.

- **NEVER hardcode user-facing strings.** Use `const { t } = useTranslation()` and `t("namespace.key")`. This includes toast/`Alert.alert` text, `placeholder`, `accessibilityLabel`, and empty-state copy — not just visible `<Text>`.
- **Every key must exist in BOTH** `src/i18n/locales/id.json` and `src/i18n/locales/en.json`, at the same path. `src/i18n/types.ts` derives the typed key union from `id.json`, so a key missing from `id.json` is a TypeScript error at the `t()` call site — but a key present in `id.json` and missing from `en.json` is **not** caught by the type system; check both files by hand.
- **Formatting** (money, dates, times, month/weekday names): use `src/lib/format.ts` (`formatMoney`, `formatDate`, `formatShortDate`, `formatTime`, `formatDateLabel`, `formatRelativeTime`, `getMonthNames`, `getWeekdayNames`, `formatChartAxisValue`), never `Intl.DateTimeFormat`/`Intl.NumberFormat`/`toLocaleDateString` directly — those helpers already read the active language. `formatMoney(amount, currency = "IDR")` is currency-agnostic; do not hardcode "Rp" in a string, that's what `formatMoney` is for.
- **Adding a language** (e.g. Japanese): 1) create `src/i18n/locales/ja.json` (copy `en.json`, translate every value), 2) add one entry to `SUPPORTED_LANGUAGES` in `src/i18n/registry.ts` (`code`, `nativeName`, `bcp47`, `dateFnsLocale` from `date-fns/locale`, `groupingSeparator`, `resource`). Nothing else changes — `src/i18n/index.ts`, the Settings language switcher (`LanguageSheet`), and `lib/format.ts` all derive from this registry.
- **Zod schemas with translated error messages** (e.g. `finance/new.tsx`, `accounts/index.tsx`, `CategoryFormSheet.tsx`): a module-scope `z.object({...})` evaluates its message strings once at import time, before i18n has a language. Use the factory pattern instead — `function makeSchema(t: TFunction) { return z.object({...}) }` inside the file, then `const schema = useMemo(() => makeSchema(t), [t])` in the component.
- **Arrays of `{value, label}` used for chips/pickers/filters** (e.g. quick-action chips, category type toggle): store `labelKey` (a literal string union of the exact i18n keys, not `string`) instead of a hardcoded `label`, and render `t(opt.labelKey)`. A plain `string` type defeats the typed-key check on `t()`.
- **Notification content** (`lib/notifications.ts`): `scheduleDailyReminder()` reads `i18n.t()` at schedule time, not at import time, since the copy is baked into the OS-level scheduled notification. Any code that changes the active language while a reminder is enabled must re-call `scheduleDailyReminder()` (see `src/stores/language.ts` `setPreference`).
- **Class components** (e.g. `ErrorBoundary.tsx`) can't use the `useTranslation()` hook — import the `i18n` singleton from `@/i18n` and call `i18n.t()` directly.
- **Tests**: `jest.setup.ts` initializes i18n to `id` before every test file runs, so existing component tests asserting Indonesian copy (e.g. "Batal", "Simpan", "Coba lagi") continue to pass unchanged — those strings are the literal `id.json` values, not coincidence.
- **Data is not UI copy**: the 35 default categories (`src/features/finance/constants/defaultCategories.ts`) are seed data written to the database/SQLite, and the literal message text sent to AI chat by quick chips (`src/features/ai/utils/quickChips.ts` `text:` field) is intentionally Indonesian regardless of UI language — the AI backend prompts are Indonesian-only for now (see `docs/PRD.md` §2.5). Neither should be run through `t()`.
