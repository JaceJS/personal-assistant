# 1. THE PLATFORM: EXPO

- This is an Expo project (managed workflow), NOT bare React Native.
- Read the Expo docs at https://docs.expo.dev/versions/v54.0.0/ before writing code.
- Expo modules (e.g., expo-router, expo-notifications) are used instead of pure React Native APIs.
- Do not attempt to run pod install, gradlew, or native build commands unless explicitly allowed or necessary for a specific Expo tool.
- Be aware of SDK version compatibility.

# 2. NAVIGATION

- Primary navigation uses expo-router (a file-system-based router).
- Do NOT use Stack, Drawer, or Tab components from react-navigation.
- Do NOT manually create StackNavigators or NavigationContainers.
- Use the <Tabs> component from "expo-router" for tab-based navigation.
- Use the useRouter hook from "expo-router" to navigate.
- Screen components must be exported from app/\* files.
- Nested routes are created by nesting folders inside app/\* (e.g., app/(tabs)/index.tsx is the home screen, app/(tabs)/settings.tsx is a settings screen).

# 3. STATE MANAGEMENT

- Use Zustand for global state.
- State should be persisted (Zustand + persist middleware).
- Avoid deeply nested state structures; keep them flat and focused.
- For finance data, use TanStack Query/Supabase for caching and real-time subscriptions.

# 4. DATA LAYERING (NO MOCKING)

- NEVER use mock data (no mockAPI, no mockClient, no fake responses).
- Use Supabase as the single source of truth for all data.
- Always use the Supabase client from app/lib/supabase.ts for all queries.
- Use TanStack Query for caching, loading states, error states, and background refetching.
- Handle loading states, error states, and empty states for all data operations.
- Respect the database schema at all times.

# 5. THEME & UI

- Colors are managed by Tailwind CSS v4.
- Primary accent color: #2563eb (indigo-600).
- Use Tailwind utility classes for styling.
- Do not use inline styles for basic layout; use Tailwind.
- Use the colors object from @/theme for named colors.
- Padding: 20px = spacing.xl, 16px = spacing.lg, 12px = spacing.md, 8px = spacing.sm.
- Rounded corners: radius.full (pill), radius.lg, radius.md.

# 6. COMPONENTS

- Use the Header component from @/components/layout/Header for top navigation bars.
- Use the Screen component from @/components/layout/Screen for full-screen layouts.
- Header allows custom title, back button, and right-side actions.
- Do NOT implement headers or navigation yourself; use the provided components.
- Use Card for grouping related content.

# 7. HOOKS & LOGIC

- Use custom hooks from @/hooks/ for business logic.
- Use useUser hook for auth-related user data.
- Use useNotifications hook for notification management.
- Keep hooks focused on a single responsibility.

# 8. FILE NAMING & LOCATION

- Place all business logic in app/features/\*/.
- Place custom hooks in app/hooks/.
- Place UI components in app/components/.
- Place utilities in app/lib/.
- Keep files small and focused on a single responsibility.

# 9. UI/UX STANDARDS

- Never display loading spinners for more than 300ms. If loading takes longer, show empty state or skeleton.
- Keep screens clean and focused on a single primary action.
- Use cards and proper spacing for visual hierarchy.
- Always handle loading and error states gracefully.

# 10. ERROR HANDLING

- Use Toast.show for user-facing errors (non-critical).
- Use console.error for logging issues.
- Display user-friendly messages instead of stack traces.
- Never display null or undefined; show empty states instead.
- Use fallback values when data might be missing.
- Always handle auth errors (e.g., session expired).

# 11. DESIGN RULES

- Use the Tailwind v4 color palette from @/theme/colors.ts.
- Use spacing tokens from @/theme/spacing.ts (spacing.xl = 20px).
- Use radius tokens from @/theme/radius.ts.
- Avoid using plain hex colors when Tailwind equivalents exist.
- Keep UI consistent with existing app patterns.
- All text should use Inter font.

# 12. PERFORMANCE

- Avoid re-renders by memoizing callbacks and values (use useCallback, useMemo).
- Limit list virtualization to items > 10.
- Don't perform heavy computations in render; use useMemo.
- Minimize unnecessary database queries.

# 13. CODE QUALITY

- Use TypeScript for all new code.
- Follow the existing code style in the project.
- Add comments only for complex logic.
- Keep functions small and focused (single responsibility).
- Avoid deeply nested conditionals (max 2-3 levels).

# 14. NOTIFICATIONS

- Notifications should be handled by the useNotifications hook.
- Schedule notifications using notification_client.schedule.
- Use notification_client.cancel to cancel.
- Use notification_client.scheduleRepeat for recurring notifications.
- Notifications should be user-initiated.
- Notifications are handled by Supabase Database Functions (not stored in regular tables).
