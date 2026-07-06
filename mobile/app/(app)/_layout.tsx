import { Stack } from "expo-router";

// Anchor keeps (tabs) beneath finance/accounts on direct entry (cold start,
// future deep links) so back() always has somewhere real to pop to.
export const unstable_settings = { anchor: "(tabs)" };

export default function AppLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="finance" />
      <Stack.Screen name="accounts" />
    </Stack>
  );
}
