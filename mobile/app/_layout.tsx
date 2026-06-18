import "../global.css";

import * as Sentry from "@sentry/react-native";
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
} from "@expo-google-fonts/plus-jakarta-sans";
import { useFonts } from "expo-font";
import { QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { useEffect, useState } from "react";
import { SafeAreaProvider, initialWindowMetrics } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { queryClient } from "@/lib/queryClient";
import { runMigrations } from "@/lib/db/client";
import { Toast } from "@/components/ui/Toast";
import { useAuth } from "@/hooks/useAuth";
import { useOnboardingStore } from "@/stores/onboarding";

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  enabled: !__DEV__,
  tracesSampleRate: 0.2,
  environment: __DEV__ ? "development" : "production",
});


function RootLayoutInner() {
  const [fontsLoaded] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
  });
  const [dbReady, setDbReady] = useState(false);

  useAuth();
  const { initialize } = useOnboardingStore();

  useEffect(() => {
    async function setup() {
      try {
        await runMigrations();
        await initialize();
      } catch (e) {
        console.error("[startup] setup failed:", e);
      } finally {
        setDbReady(true);
      }
    }
    void setup();
  }, [initialize]);

  if (!fontsLoaded || !dbReady) return null;

  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="ai-assistant" options={{ presentation: "modal" }} />
      </Stack>
      <Toast />
    </SafeAreaProvider>
  );
}

function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <RootLayoutInner />
      </ErrorBoundary>
    </QueryClientProvider>
  );
}

export default Sentry.wrap(RootLayout);
