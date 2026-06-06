import { useCallback, useEffect } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Bell } from "lucide-react-native";

import InsightCard from "@/components/ui/InsightCard";
import AccountBalanceCard from "@/features/finance/components/AccountBalanceCard";
import DailySpendCard from "@/features/finance/components/DailySpendCard";
import RecentTransactions from "@/features/finance/components/RecentTransactions";
import { useBudget } from "@/features/finance/hooks/useBudget";
import { useTransactions } from "@/features/finance/hooks/useTransactions";
import { formatRupiah } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth";
import { useToastStore } from "@/stores/toast";
import { colors, textStyles } from "@/theme";
import { Header } from "@/components/layout/Header";

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { showToast } = useToastStore();
  const { data: txData, isLoading: txLoading, isRefetching, refetch, error: txError } = useTransactions();
  const { data: budget, error: budgetError } = useBudget();

  useEffect(() => {
    if (txError) showToast("Failed to load transactions", "error");
  }, [txError, showToast]);

  useEffect(() => {
    if (budgetError) showToast("Failed to load budget", "error");
  }, [budgetError, showToast]);

  const handleTxPress = useCallback(
    (id: string) => router.push(`/(app)/(home)/${id}`),
    [router],
  );

  const firstName = user?.email?.split("@")[0] ?? "there";
  const items = txData?.items ?? [];

  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const dailyLimit =
    budget?.monthly_limit != null ? Math.round(budget.monthly_limit / daysInMonth) : 0;

  const todayStr = now.toISOString().slice(0, 10);
  const todayItems = items.filter((t) => t.occurred_at.startsWith(todayStr));
  const todayExpense = todayItems
    .filter((t) => t.amount < 0)
    .reduce((s, t) => s + Math.abs(t.amount), 0);
  const budgetPct = dailyLimit > 0 ? Math.min(todayExpense / dailyLimit, 1) : 0;

  return (
    <SafeAreaView style={styles.root}>
      <Header
        title=""
        left={
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{firstName[0]?.toUpperCase() ?? "U"}</Text>
          </View>
        }
        right={<Bell size={22} color={colors.text.secondary} strokeWidth={1.5} />}
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

        <DailySpendCard />

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.insightList}
          style={styles.insightScroll}
        >
          <InsightCard
            label="Today's Spend"
            highlight={formatRupiah(todayExpense)}
            body={todayExpense === 0 ? "No expenses recorded today" : "Daily limit tracking active"}
            variant="accent"
            badge="Today"
          />
          <InsightCard
            label="Budget Signal"
            body={
              budgetPct < 0.5
                ? "Well within daily budget — great control"
                : budgetPct < 1
                  ? "Approaching your daily limit"
                  : "Daily limit exceeded today"
            }
            variant={budgetPct >= 1 ? "warning" : budgetPct >= 0.7 ? "info" : "success"}
            badge={budgetPct >= 0.7 ? "Watch Out" : "On Track"}
          />
        </ScrollView>

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

  insightScroll: { marginBottom: 16 },
  insightList: { paddingHorizontal: 20, gap: 12 },
});
