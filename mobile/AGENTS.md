# Mobile — Claude Code Guide

> See root `CLAUDE.md` for monorepo overview and security rules.

## Commands (run from `mobile/`)
```bash
npm run android     # build & run on Android
npm run ios         # build & run on iOS
npm start           # Expo dev server (Expo Go compatible features only)
npm run lint        # ESLint
npm run gen:api     # regenerate TypeScript types from OpenAPI schema
```
> Adding a new native module (e.g. expo-image-picker) requires rebuilding the dev client:
> `npm run android` or `npm run ios` — Expo Go won't have it.

---

# 1. THE PLATFORM: EXPO

- Expo managed workflow, SDK 54. Read https://docs.expo.dev/versions/v54.0.0/ before writing code.
- Use Expo modules (`expo-router`, `expo-audio`, `expo-image-picker`, etc.) — not bare RN equivalents.
- Do NOT run `pod install`, `gradlew`, or native build commands manually.

---

# 2. NAVIGATION

- File-system routing via `expo-router`. Routes map to files under `app/`.
- Use `useRouter()` from `"expo-router"` to navigate. Never use `react-navigation` directly.
- **Bug known:** Never use `/index` suffix in `router.push()` when a folder has both `index.tsx`
  and `[id].tsx`. Use the folder path: `router.push('/(app)/accounts')` not `/(app)/accounts/index`.
  Doing so passes `"index"` as the `[id]` param → API 422 UUID error.
- Tab navigation: `<Tabs>` from `"expo-router"`. Custom tab bar: `FloatingTabBar` in
  `src/components/ui/FloatingTabBar.tsx`.
- Protected routes live in `app/(app)/`. Auth routes in `app/(auth)/`.

---

# 3. DATA LAYER — NO MOCKING

- **Supabase = auth only** (sign in, sign out, token refresh via `src/lib/supabase.ts`).
- **FastAPI = all data** (accounts, transactions, categories, budget, voice). Use `apiFetch()`
  from `src/lib/api/client.ts` — it attaches the Supabase JWT automatically.
- NEVER call Supabase REST/realtime for finance data.
- NEVER use mock data, mock API clients, or fake responses.
- Use TanStack Query for all server state. Query hooks live in `src/features/finance/hooks/`.
- Always handle loading, error, and empty states.

---

# 4. STATE MANAGEMENT

- **Zustand** for global client state (`src/stores/`): `auth`, `toast`, `recording`, `onboarding`.
- **TanStack Query** for server state (default `staleTime: 5min`).
- Keep Zustand stores flat. Persist only what survives app restarts (`onboarding`, session).
- Do NOT store server data in Zustand — that's what TanStack Query is for.

---

# 5. THEME & STYLING

The app uses **React Native StyleSheet** with design tokens — NOT Tailwind utility classes.

```typescript
import { colors, radius, spacing, textStyles } from '@/theme';
```

| Token | File | Values |
|-------|------|--------|
| `colors` | `src/theme/colors.ts` | `bg.canvas` `bg.surface` `bg.elevated` `accent.primary` `text.primary` ... |
| `spacing` | `src/theme/spacing.ts` | `xs(4)` `sm(8)` `md(12)` `lg(16)` `xl(20)` `2xl(24)` `3xl(32)` |
| `radius` | `src/theme/radius.ts` | `sm(6)` `md(10)` `lg(14)` `xl(20)` `full(999)` |
| `textStyles` | `src/theme/typography.ts` | See Typography section below |

**Key colors:**
- `colors.bg.canvas` — `#0C0C0E` (darkest background)
- `colors.bg.surface` — `#18181C` (card/sheet background)
- `colors.accent.primary` — `#7B6FE8` (purple, main accent)
- `colors.accent.subtle` — `#17152E` (icon box backgrounds)
- `colors.text.primary` — `#EEEDF5`
- `colors.text.muted` — `#5E5C70`

---

# 6. TYPOGRAPHY SYSTEM

Font family: **Plus Jakarta Sans** (loaded via Expo Font).

```typescript
import { textStyles } from '@/theme';
import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  title: {
    ...StyleSheet.flatten(textStyles.h2),   // spread to merge with overrides
    color: colors.accent.primary,           // override specific props
  },
  label: {
    ...StyleSheet.flatten(textStyles.overline),
    marginBottom: 6,
  },
});
```

| Style | Size | Weight | Notes |
|-------|------|--------|-------|
| `textStyles.display` | 32 | 700 | Large hero numbers |
| `textStyles.h1` | 24 | 700 | Page titles |
| `textStyles.h2` | 18 | 600 | Section headings |
| `textStyles.h3` | 15 | 600 | Card titles, menu labels |
| `textStyles.body` | 15 | 400 | Body text |
| `textStyles.caption` | 12 | 400 | Secondary labels, currency |
| `textStyles.overline` | 11 | 500 | Section labels (uppercase, tracked) |

**Rules:**
- **NEVER** write raw `fontFamily` strings (e.g. `'PlusJakartaSans_700Bold'`).
- **NEVER** write `fontWeight` without also spreading a `textStyles.*` base.
- For sizes not in the scale, spread the closest base and override `fontSize` only.

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

---

# 8. SETTINGS PAGE STRUCTURE

`app/(app)/settings/index.tsx` — reference for grouped settings patterns:
- Profile hero card: centered, `radius.full` circular avatar, pencil badge for image picker
- Sections: ACCOUNT, FINANCE, LEGAL — rendered with `SectionLabel` + `GroupedList` + `MenuItem`
- Icon boxes: 32×32, `radius.md`, `bg: colors.accent.subtle`, icon color `colors.accent.primary`
- Section dividers: `marginLeft: 60` to clear icon box
- Sign Out: full-width, `colors.danger.bg` bg, centered content, `radius.xl`
- Bottom padding: `160px` to clear the floating tab bar + mic FAB

---

# 9. ACCOUNTS PAGE STRUCTURE

`app/(app)/accounts/index.tsx`:
- `TotalBalanceCard` at top — sums non-credit account balances, accent left border (3px)
- `AccountCard` (`src/features/finance/components/AccountCard.tsx`):
  - 44×44 icon box with `ACCOUNT_TYPE_EMOJI` + type-specific bg tint
  - Balance row indented `paddingLeft: 56` to align with text
  - Type bg tints: `bank→info.bg`, `cash→success.bg`, `ewallet→accent.subtle`, `credit→danger.bg`

---

# 10. FILE NAMING & LOCATION

```
app/(app)/           — screen files (routes)
src/components/ui/   — reusable UI components
src/components/layout/ — layout wrappers
src/features/<domain>/
  api/               — apiFetch() wrappers
  components/        — domain-specific components
  hooks/             — TanStack Query hooks
  types.ts           — TypeScript types
  constants.ts       — domain constants
src/hooks/           — cross-domain hooks
src/lib/             — utilities, clients (api, supabase, queryClient)
src/stores/          — Zustand stores
src/theme/           — design tokens (colors, spacing, radius, typography)
```

---

# 11. ERROR HANDLING

- Use `useToastStore().showToast(msg, 'error')` for non-critical API errors.
- Never show raw error messages or stack traces to users.
- Always provide fallback values: `user?.email ?? ''`, `data?.items ?? []`.
- Empty states: use `<EmptyState>` component, never render nothing.
- Auth expiry: `onAuthStateChange` in `src/hooks/useAuth.ts` handles session refresh + redirect.

---

# 12. PERFORMANCE

- Memoize callbacks with `useCallback`, derived values with `useMemo`.
- `renderItem` in any FlatList must be `useCallback`.
- Use `SkeletonList` for loading states — never a spinner for data fetches.
- Categories query uses `staleTime: Infinity` (loaded once, changes rarely).

---

# 13. CODE QUALITY

- TypeScript for all new code. No `any` without a comment explaining why.
- No inline styles for anything that might repeat — extract to `StyleSheet.create`.
- Small, focused components. If a component needs "and" to describe it, split it.
- No comments that restate the code. Comment only non-obvious WHY.

---

# 14. WHAT NOT TO DO

- **NEVER** call Supabase REST for data — use FastAPI via `apiFetch()`
- **NEVER** use mock data or fake API responses
- **NEVER** write raw `fontFamily` strings — use `textStyles.*`
- **NEVER** use `router.push('/(app)/accounts/index')` — use `'/(app)/accounts'`
- **NEVER** use `react-navigation` components — only `expo-router`
- **NEVER** add a new native module without noting it requires a dev client rebuild
- **NEVER** use float for money — amounts are integer rupiah from the API
- **NEVER** skip loading/error/empty states on any data-fetching screen
