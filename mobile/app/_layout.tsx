import "../global.css";

import * as Sentry from "@sentry/react-native";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
} from "@expo-google-fonts/plus-jakarta-sans";
import { useFonts } from "expo-font";
import { QueryClientProvider, focusManager } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { useEffect, useState } from "react";
import { AppState } from "react-native";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider, initialWindowMetrics } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { queryClient } from "@/lib/queryClient";
import { runMigrations } from "@/lib/db/client";
import { logger } from "@/lib/logger";
import { Toast } from "@/components/ui/Toast";
import { GuestDataMergeSheet } from "@/features/sync/components/GuestDataMergeSheet";
import { useAuth } from "@/hooks/useAuth";
import { useLanguageStore } from "@/stores/language";
import { useOnboardingStore } from "@/stores/onboarding";

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  enabled: !__DEV__,
  tracesSampleRate: 0.2,
  environment: __DEV__ ? "development" : "production",
});

focusManager.setEventListener((handleFocus) => {
  const subscription = AppState.addEventListener("change", (state) => {
    handleFocus(state === "active");
  });
  return () => subscription.remove();
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
  const initializeOnboarding = useOnboardingStore((s) => s.initialize);
  const initializeLanguage = useLanguageStore((s) => s.initialize);

  useEffect(() => {
    async function setup() {
      try {
        // Migrasi SQLite tidak bergantung pada onboarding/bahasa — jalan paralel.
        await Promise.all([runMigrations(), initializeOnboarding(), initializeLanguage()]);
      } catch (e) {
        logger.error("[startup] setup failed", e);
      } finally {
        setDbReady(true);
      }
    }
    void setup();
  }, [initializeOnboarding, initializeLanguage]);

  if (!fontsLoaded || !dbReady) return null;

  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="ai-assistant" options={{ presentation: "modal" }} />
        <Stack.Screen name="delete-account" />
      </Stack>
      <Toast />
      <GuestDataMergeSheet />
    </SafeAreaProvider>
  );
}

function RootLayout() {
  return (
    <KeyboardProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <QueryClientProvider client={queryClient}>
          <ErrorBoundary>
            <RootLayoutInner />
          </ErrorBoundary>
        </QueryClientProvider>
      </GestureHandlerRootView>
    </KeyboardProvider>
  );
}

export default Sentry.wrap(RootLayout);
