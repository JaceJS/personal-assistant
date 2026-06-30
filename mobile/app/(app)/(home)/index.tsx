import { useCallback, useEffect, useMemo } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text } from "react-native";
import { useRouter } from "expo-router";
import { Plus } from "lucide-react-native";

import { Screen } from "@/components/layout/Screen";
import Fab from "@/components/ui/Fab";
import AccountBalanceCard from "@/features/finance/components/AccountBalanceCard";
import DailySpendCard from "@/features/finance/components/DailySpendCard";
import MonthlyBudgetCard from "@/features/finance/components/MonthlyBudgetCard";
import ProjectedEndOfMonthCard from "@/features/finance/components/ProjectedEndOfMonthCard";
import TopCategoriesCard from "@/features/finance/components/TopCategoriesCard";
import WeeklySummaryCard from "@/features/finance/components/WeeklySummaryCard";
import { AIInsightCard } from "@/features/ai/components/AIInsightCard";
import HomeFirstRunChecklist from "@/features/finance/components/HomeFirstRunChecklist";
import { useQueryClient } from "@tanstack/react-query";
import { useTransactions } from "@/features/finance/hooks/useTransactions";
import { useFirstRun } from "@/features/finance/hooks/useFirstRun";
import { useAuthStore } from "@/stores/auth";
import { useOnboardingStore } from "@/stores/onboarding";
import { useToastStore } from "@/stores/toast";
import { getDisplayName } from "@/lib/getDisplayName";
import { colors, spacing, textStyles } from "@/theme";

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Selamat pagi";
  if (h < 17) return "Selamat siang";
  return "Selamat malam";
}

export default function HomeScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { showToast } = useToastStore();
  const { isFirstRun, ...firstRunState } = useFirstRun();
  const dismissFirstRun = useOnboardingStore((s) => s.dismissFirstRun);

  const now = new Date();
  const dateFrom = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    '01',
  ].join('-');
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const dateTo = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(lastDay).padStart(2, '0'),
  ].join('-');

  const {
    data: monthTxData,
    isRefetching,
    refetch,
    error: txError,
  } = useTransactions({ dateFrom, dateTo, limit: 200 });

  useEffect(() => {
    if (txError) showToast("Gagal memuat transaksi", "error");
  }, [txError, showToast]);

  const totalExpense = useMemo(
    () =>
      (monthTxData?.items ?? [])
        .filter((t) => t.amount < 0)
        .reduce((s, t) => s + Math.abs(t.amount), 0),
    [monthTxData]
  );

  const handleRefresh = useCallback(async () => {
    await Promise.all([
      refetch(),
      queryClient.invalidateQueries({ queryKey: ["transactions"] }),
      queryClient.invalidateQueries({ queryKey: ["budget"] }),
    ]);
  }, [refetch, queryClient]);

  const firstName = getDisplayName(user);

  return (
    <Screen>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={handleRefresh}
            tintColor={colors.accent.primary}
          />
        }
      >
        <Text style={styles.greeting}>
          {getGreeting()}
          {firstName ? `, ${firstName}` : ""}!
        </Text>

        {isFirstRun ? (
          <>
            <HomeFirstRunChecklist state={firstRunState} onDismiss={dismissFirstRun} />
            <AccountBalanceCard />
          </>
        ) : (
          <>
            <AccountBalanceCard />
            <DailySpendCard />
            <WeeklySummaryCard />
            <MonthlyBudgetCard totalExpense={totalExpense} from="home" />
            <TopCategoriesCard />
            <ProjectedEndOfMonthCard />
            <AIInsightCard />
          </>
        )}
      </ScrollView>

      <Fab
        onPress={() => router.push({ pathname: "/(app)/finance/new", params: { from: "home" } })}
        icon={Plus}
        accessibilityLabel="Add transaction"
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 120, paddingTop: spacing.xs },
  greeting: {
    ...StyleSheet.flatten(textStyles.display),
    fontSize: 26,
    letterSpacing: -0.5,
    paddingHorizontal: spacing["2xl"],
    marginVertical: 20,
  },
});
