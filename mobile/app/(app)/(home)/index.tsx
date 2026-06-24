import { useCallback, useEffect } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import AccountBalanceCard from "@/features/finance/components/AccountBalanceCard";
import DailySpendCard from "@/features/finance/components/DailySpendCard";
import RecentTransactions from "@/features/finance/components/RecentTransactions";
import { AIInsightCard } from "@/features/ai/components/AIInsightCard";
import { useTransactions } from "@/features/finance/hooks/useTransactions";
import { useAuthStore } from "@/stores/auth";
import { useToastStore } from "@/stores/toast";
import { getDisplayName } from "@/lib/getDisplayName";
import { colors, textStyles } from "@/theme";
import { Header } from "@/components/layout/Header";

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Selamat pagi";
  if (h < 17) return "Selamat siang";
  return "Selamat malam";
}

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { showToast } = useToastStore();
  const {
    data: txData,
    isLoading: txLoading,
    isRefetching,
    refetch,
    error: txError,
  } = useTransactions();

  useEffect(() => {
    if (txError) showToast("Failed to load transactions", "error");
  }, [txError, showToast]);

  const handleTxPress = useCallback((id: string) => router.push(`/(app)/(home)/${id}`), [router]);

  const firstName = getDisplayName(user);
  const items = txData?.items ?? [];

  return (
    <SafeAreaView style={styles.root}>
      <Header
        title=""
        left={
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{firstName[0]?.toUpperCase() ?? "U"}</Text>
          </View>
        }
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.accent.primary}
          />
        }
      >
        <Text style={styles.greeting}>
          {getGreeting()}, {firstName}.
        </Text>

        <AccountBalanceCard />

        <AIInsightCard />

        <DailySpendCard />

        <RecentTransactions
          items={items.slice(0, 3)}
          isLoading={txLoading}
          error={!!txError}
          onSeeAll={() => router.push("/history")}
          onPress={handleTxPress}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg.canvas },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 120 },

  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.accent.subtle,
    borderWidth: 1,
    borderColor: colors.accent.border,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    ...StyleSheet.flatten(textStyles.h3),
    fontSize: 14,
    color: colors.accent.text,
  },

  greeting: {
    ...StyleSheet.flatten(textStyles.display),
    fontSize: 26,
    letterSpacing: -0.5,
    paddingHorizontal: 20,
    marginBottom: 20,
  },
});
