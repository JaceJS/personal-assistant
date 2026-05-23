import "../global.css";

import * as Sentry from "@sentry/react-native";
import {
  Outfit_400Regular,
  Outfit_500Medium,
  Outfit_600SemiBold,
  Outfit_700Bold,
  useFonts,
} from "@expo-google-fonts/outfit";
import { QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { queryClient } from "@/lib/queryClient";
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
  useAuth();
  const { initialize } = useOnboardingStore();

  useEffect(() => {
    void initialize();
  }, [initialize]);

  return (
    <>
      <Stack screenOptions={{ headerShown: false }} />
      <Toast />
    </>
  );
}

function RootLayout() {
  const [fontsLoaded] = useFonts({
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_600SemiBold,
    Outfit_700Bold,
  });

  if (!fontsLoaded) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator color="#6366f1" />
      </View>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <RootLayoutInner />
      </ErrorBoundary>
    </QueryClientProvider>
  );
}

export default Sentry.wrap(RootLayout);
