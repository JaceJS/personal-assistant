import { ActivityIndicator, View } from "react-native";
import { Redirect } from "expo-router";

import { useAuthStore } from "@/stores/auth";
import { useOnboardingStore } from "@/stores/onboarding";

export default function Index() {
  const { session, initialized: authInitialized } = useAuthStore();
  const { isComplete: onboardingComplete, initialized: onboardingInitialized } =
    useOnboardingStore();

  if (!authInitialized || !onboardingInitialized) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  if (!session) return <Redirect href="/(auth)/login" />;
  if (!onboardingComplete) return <Redirect href="/onboarding/welcome" />;
  return <Redirect href="/(app)" />;
}
