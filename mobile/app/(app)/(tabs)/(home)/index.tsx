import { useCallback, useEffect, useMemo } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text } from "react-native";
import { useRouter } from "expo-router";
import { Plus } from "lucide-react-native";
import { useTranslation } from "react-i18next";

import { Screen } from "@/components/layout/Screen";
import Fab from "@/components/ui/Fab";
import AccountBalanceCard from "@/features/finance/components/AccountBalanceCard";
import DailySpendCard from "@/features/finance/components/DailySpendCard";
import GuestModeBanner from "@/features/finance/components/GuestModeBanner";
import MonthlyBudgetCard from "@/features/finance/components/MonthlyBudgetCard";
import ProjectedEndOfMonthCard from "@/features/finance/components/ProjectedEndOfMonthCard";
import TopCategoriesCard from "@/features/finance/components/TopCategoriesCard";
import WeeklySummaryCard from "@/features/finance/components/WeeklySummaryCard";
import { AIInsightCard } from "@/features/ai/components/AIInsightCard";
import HomeFirstRunChecklist from "@/features/finance/components/HomeFirstRunChecklist";
import { useIsFetching, useQueryClient } from "@tanstack/react-query";
import { useTransactions } from "@/features/finance/hooks/useTransactions";
import { useFirstRun } from "@/features/finance/hooks/useFirstRun";
import { useAuthStore } from "@/stores/auth";
import { useToastStore } from "@/stores/toast";
import { useDisplayName } from "@/hooks/useDisplayName";
import { colors, spacing, textStyles } from "@/theme";
import { TAB_BAR_CLEARANCE } from "@/components/ui/FloatingTabBar";
import type { TFunction } from "i18next";

function getGreeting(t: TFunction): string {
  const h = new Date().getHours();
  if (h < 12) return t("home.greeting.morning");
  if (h < 17) return t("home.greeting.afternoon");
  return t("home.greeting.evening");
}

export default function HomeScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const isGuest = useAuthStore((s) => s.isGuest);
  const showToast = useToastStore((s) => s.showToast);
  const { isFirstRun, ...firstRunState } = useFirstRun();

  const { dateFrom, dateTo } = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    return {
      dateFrom: `${y}-${m}-01`,
      dateTo: `${y}-${m}-${String(lastDay).padStart(2, "0")}`,
    };
  }, []);

  const { data: monthTxData, error: txError } = useTransactions({ dateFrom, dateTo, limit: 200 });
  const isFetching = useIsFetching({ queryKey: ["transactions"] });

  useEffect(() => {
    if (txError) showToast(t("home.loadTransactionsFailed"), "error");
  }, [txError, showToast, t]);

  const totalExpense = useMemo(
    () =>
      (monthTxData?.items ?? [])
        .filter((t) => t.amount < 0)
        .reduce((s, t) => s + Math.abs(t.amount), 0),
    [monthTxData]
  );

  const handleRefresh = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["transactions"] }),
      queryClient.invalidateQueries({ queryKey: ["budget"] }),
      queryClient.invalidateQueries({ queryKey: ["accounts"] }),
    ]);
  }, [queryClient]);

  const firstName = useDisplayName();

  return (
    <Screen>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isFetching > 0}
            onRefresh={handleRefresh}
            tintColor={colors.accent.primary}
          />
        }
      >
        <Text style={styles.greeting}>
          {getGreeting(t)}
          {firstName ? `, ${firstName}` : ""}!
        </Text>

        {isGuest && <GuestModeBanner />}

        {isFirstRun && <HomeFirstRunChecklist state={firstRunState} />}

        <AccountBalanceCard />
        <DailySpendCard />
        <WeeklySummaryCard />
        <MonthlyBudgetCard totalExpense={totalExpense} />
        <TopCategoriesCard />
        <ProjectedEndOfMonthCard />
        <AIInsightCard />
      </ScrollView>

      <Fab
        onPress={() => router.push("/(app)/finance/new")}
        icon={Plus}
        accessibilityLabel={t("home.addTransactionA11y")}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: TAB_BAR_CLEARANCE, paddingTop: spacing.xs },
  greeting: {
    ...StyleSheet.flatten(textStyles.display),
    fontSize: 26,
    letterSpacing: -0.5,
    paddingHorizontal: spacing["2xl"],
    marginVertical: 20,
  },
});
