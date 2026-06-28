import { useEffect, useMemo } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text } from "react-native";
import { useRouter } from "expo-router";
import { Plus } from "lucide-react-native";

import { Screen } from "@/components/layout/Screen";
import { Header } from "@/components/layout/Header";
import Fab from "@/components/ui/Fab";
import AccountBalanceCard from "@/features/finance/components/AccountBalanceCard";
import DailySpendCard from "@/features/finance/components/DailySpendCard";
import MonthlyBudgetCard from "@/features/finance/components/MonthlyBudgetCard";
import ProjectedEndOfMonthCard from "@/features/finance/components/ProjectedEndOfMonthCard";
import TopCategoriesCard from "@/features/finance/components/TopCategoriesCard";
import { AIInsightCard } from "@/features/ai/components/AIInsightCard";
import { useTransactions } from "@/features/finance/hooks/useTransactions";
import { useAuthStore } from "@/stores/auth";
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
  const { user } = useAuthStore();
  const { showToast } = useToastStore();

  const now = new Date();
  const dateFrom = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const dateTo = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);

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
            onRefresh={refetch}
            tintColor={colors.accent.primary}
          />
        }
      >
        <Text style={styles.greeting}>
          {getGreeting()}
          {firstName ? `, ${firstName}` : ""}!
        </Text>

        <AccountBalanceCard />

        <DailySpendCard />

        <MonthlyBudgetCard totalExpense={totalExpense} />

        <TopCategoriesCard />

        <ProjectedEndOfMonthCard />

        <AIInsightCard />
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
