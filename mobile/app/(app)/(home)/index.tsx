import { useCallback, useEffect, useMemo } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Plus } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Header } from "@/components/layout/Header";
import AccountBalanceCard from "@/features/finance/components/AccountBalanceCard";
import DailySpendCard from "@/features/finance/components/DailySpendCard";
import MonthlyBudgetCard from "@/features/finance/components/MonthlyBudgetCard";
import ProjectedEndOfMonthCard from "@/features/finance/components/ProjectedEndOfMonthCard";
import { AIInsightCard } from "@/features/ai/components/AIInsightCard";
import { useTransactions } from "@/features/finance/hooks/useTransactions";
import { useAuthStore } from "@/stores/auth";
import { useToastStore } from "@/stores/toast";
import { getDisplayName } from "@/lib/getDisplayName";
import { colors, radius, spacing, textStyles } from "@/theme";

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
    [monthTxData],
  );

  const firstName = getDisplayName(user);

  const addButton = useCallback(
    () => (
      <Pressable
        onPress={() => router.push("/(app)/finance/new")}
        hitSlop={8}
        style={({ pressed }) => pressed && { opacity: 0.7 }}
      >
        <View style={styles.addBtn}>
          <Plus size={18} color={colors.accent.primary} strokeWidth={2} />
        </View>
      </Pressable>
    ),
    [router],
  );

  return (
    <SafeAreaView style={styles.root}>
      <Header
        title=""
        left={
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{firstName[0]?.toUpperCase() ?? "U"}</Text>
          </View>
        }
        right={addButton()}
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

        <MonthlyBudgetCard totalExpense={totalExpense} />

        <ProjectedEndOfMonthCard />

        <AIInsightCard />

        <DailySpendCard />
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

  addBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.accent.subtle,
    alignItems: "center",
    justifyContent: "center",
  },

  greeting: {
    ...StyleSheet.flatten(textStyles.display),
    fontSize: 26,
    letterSpacing: -0.5,
    paddingHorizontal: spacing.xl,
    marginBottom: 20,
  },
});
