# Mobile — Claude Code Guide

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

# 1. THE PLATFORM: EXPO SDK 54

- Expo managed workflow, **SDK 54**. Read https://docs.expo.dev/versions/v54.0.0/ before writing code.
- Use Expo modules (`expo-router`, `expo-audio`, `expo-image-picker`, etc.) — not bare RN equivalents.
- **ALWAYS add/update native packages with `npx expo install <pkg>` — NEVER `npm install`.** This resolves the version compatible with SDK 54 from Expo's registry. Installing a package built for a newer SDK (e.g. expo-sqlite 56.x on SDK 54) causes `ClassNotFoundException` native crashes.
- After any native dependency change, run `npx expo install --fix` to align all packages.
- Do NOT run `pod install`, `gradlew`, or native build commands manually.

---

# 2. NAVIGATION

- File-system routing via `expo-router`. Routes map to files under `app/`.
- Use `useRouter()` from `"expo-router"` to navigate. Never use `react-navigation` directly.
- **Bug known:** Never use `/index` suffix in `router.push()` when a folder has both `index.tsx` and `[id].tsx`. Use the folder path: `router.push('/(app)/accounts')` not `/(app)/accounts/index` — doing so passes `"index"` as `[id]` → API 422 UUID error.
- Tab navigation: `<Tabs>` from `"expo-router"`. Custom tab bar: `FloatingTabBar` in `src/components/ui/FloatingTabBar.tsx`.
- Protected routes in `app/(app)/`. Auth routes in `app/(auth)/`.

---

# 3. DATA LAYER — NO MOCKING

- **Supabase = auth only** (sign in, sign out, token refresh via `src/lib/supabase.ts`).
- **FastAPI = all data** (accounts, transactions, categories, budget, voice). Use `apiFetch()` from `src/lib/api/client.ts` — it attaches the Supabase JWT automatically.
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

Use **React Native StyleSheet** with design tokens — NOT Tailwind utility classes.

```typescript
import { colors, radius, spacing, textStyles } from "@/theme";
```

| Token        | File                      | Values                                                                      |
| ------------ | ------------------------- | --------------------------------------------------------------------------- |
| `colors`     | `src/theme/colors.ts`     | `bg.canvas` `bg.surface` `bg.elevated` `accent.primary` `text.primary` ... |
| `spacing`    | `src/theme/spacing.ts`    | `xs(4)` `sm(8)` `md(12)` `lg(16)` `xl(20)` `2xl(24)` `3xl(32)`             |
| `radius`     | `src/theme/radius.ts`     | `sm(6)` `md(10)` `lg(14)` `xl(20)` `full(999)`                             |
| `textStyles` | `src/theme/typography.ts` | See Typography section below                                                |

Key colors: `bg.canvas` `#0C0C0E` · `bg.surface` `#18181C` · `accent.primary` `#7B6FE8` · `text.primary` `#EEEDF5` · `text.muted` `#5E5C70`

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
  Header.tsx       — screen header with title + optional back/right actions
  Screen.tsx       — SafeAreaView wrapper for full-screen layouts

src/components/ui/
  Button.tsx       — primary / secondary / ghost / danger variants
  Card.tsx         — default / elevated / accent variants
  Badge.tsx        — success / warning / danger / info
  Input.tsx        — text field with label + error
  EmptyState.tsx   — icon + title + subtitle + optional action
  Skeleton.tsx / SkeletonList.tsx — loading placeholders
  Toast.tsx        — managed via useToastStore
  FloatingTabBar.tsx — custom pill tab bar with central Mic FAB
```

- Use `<Screen>` + `<Header>` on every full screen. Never roll your own SafeAreaView + header.
- Use `useToastStore().showToast(message, type)` for user-facing feedback.
- **Never define domain components inline in screens** — extract to `src/features/<domain>/components/`.

---

# 8. FILE NAMING & LOCATION

```
app/(app)/                          — screen files (routes)
src/components/ui/                  — reusable UI components
src/components/layout/              — layout wrappers
src/features/<domain>/
  api/                              — apiFetch() wrappers
  components/                       — domain-specific components
  hooks/                            — TanStack Query hooks
  types.ts / constants.ts
src/hooks/                          — cross-domain hooks
src/lib/                            — utilities, clients (api, supabase, queryClient)
src/stores/                         — Zustand stores
src/theme/                          — design tokens
```

---

# 9. ERROR HANDLING & PERFORMANCE

- Use `useToastStore().showToast(msg, 'error')` for non-critical API errors.
- Never show raw error messages or stack traces to users.
- Always provide fallback values: `user?.email ?? ''`, `data?.items ?? []`.
- Memoize callbacks with `useCallback`, derived values with `useMemo`.
- `renderItem` in any FlatList must be `useCallback`.
- Use `SkeletonList` for loading states — never a spinner for data fetches.

---

# 10. CODE QUALITY

- TypeScript for all new code. No `any` without a comment explaining why.
- No inline styles for anything that might repeat — extract to `StyleSheet.create`.
- Small, focused components. If a component needs "and" to describe it, split it.
- No comments that restate the code. Comment only non-obvious WHY.

---

# 11. WHAT NOT TO DO

- **NEVER** use `npm install` for expo-* or react-native packages — use `npx expo install`
- **NEVER** manually pin an expo package to a version higher than what `npx expo install` resolves for SDK 54
- **NEVER** call Supabase REST for data — use FastAPI via `apiFetch()`
- **NEVER** call `apiFetch()` directly from a screen — all API calls go in `src/features/<domain>/hooks/`
- **NEVER** use mock data or fake API responses
- **NEVER** write raw `fontFamily` strings — use `textStyles.*`
- **NEVER** use `router.push('/(app)/accounts/index')` — use `'/(app)/accounts'`
- **NEVER** use `react-navigation` components — only `expo-router`
- **NEVER** use float for money — amounts are integer rupiah from the API
- **NEVER** skip loading/error/empty states on any data-fetching screen
- **NEVER** write implementation before the test for complex logic (TDD required)
- **NEVER** define domain components inline in screen files

---

# 12. TESTING — TDD REQUIRED

Write failing test first, then implement. Required for: utility/pure functions, navigation logic, bug fixes, new hooks with non-trivial state, components with conditional rendering driven by data.

```bash
npm test                  # run all tests
npm test -- <pattern>     # run matching files
```

Test runner: `jest-expo`. Assertions: `@testing-library/jest-native`. Component rendering: `@testing-library/react-native`.

File conventions:
- `src/features/<domain>/utils/__tests__/<name>.test.ts` — pure function tests
- `src/components/ui/__tests__/<name>.test.tsx` — component tests

Cover: pure utility functions, navigation handlers, data aggregation. Skip: StyleSheet rules, layout dimensions, trivial one-liners.
