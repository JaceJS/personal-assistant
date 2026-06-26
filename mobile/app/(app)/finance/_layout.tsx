import { Stack } from "expo-router";

export default function FinanceLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="new" />
      <Stack.Screen name="history" />
      <Stack.Screen name="budget" />
      <Stack.Screen name="savings-goals" />
      <Stack.Screen name="[id]" />
    </Stack>
  );
}
