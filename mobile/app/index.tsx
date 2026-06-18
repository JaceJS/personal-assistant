import { ActivityIndicator, StyleSheet, View } from "react-native";
import { Redirect } from "expo-router";

import { useAuthStore } from "@/stores/auth";
import { useOnboardingStore } from "@/stores/onboarding";
import { colors } from "@/theme";

export default function Index() {
  const { initialized: authInitialized } = useAuthStore();
  const { isComplete: onboardingComplete, initialized: onboardingInitialized } =
    useOnboardingStore();

  if (!authInitialized || !onboardingInitialized) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.accent.primary} />
      </View>
    );
  }

  if (!onboardingComplete) return <Redirect href="/onboarding/welcome" />;
  return <Redirect href="/(app)" />;
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg.canvas },
});
