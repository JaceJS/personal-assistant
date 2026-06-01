import { useCallback, useMemo } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Bell, Plus } from "lucide-react-native";

import { Header } from "@/components/layout/Header";
import { Screen } from "@/components/layout/Screen";
import CashFlowChart from "@/features/finance/components/CashFlowChart";
import MonthlyBudgetCard from "@/features/finance/components/MonthlyBudgetCard";
import ProjectedEndOfMonthCard from "@/features/finance/components/ProjectedEndOfMonthCard";
import TransactionCard from "@/features/finance/components/TransactionCard";
import { useTransactions } from "@/features/finance/hooks/useTransactions";
import { useAuthStore } from "@/stores/auth";
import { colors, radius, spacing, textStyles } from "@/theme";

const RECENT_COUNT = 3;

export default function FinanceDashboard() {
  const router = useRouter();
  const { user } = useAuthStore();
  const initial = (user?.email?.[0] ?? 'U').toUpperCase();
  const now = new Date();
  const dateFrom = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const dateTo = now.toISOString().slice(0, 10);

  const { data, isRefetching, refetch } = useTransactions({ dateFrom, dateTo, limit: 200 });
  const items = data?.items ?? [];

  const totalExpense = useMemo(
    () => items.filter((t) => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0),
    [items]
  );

  const recentItems = useMemo(() => items.slice(0, RECENT_COUNT), [items]);

  const handleAdd = useCallback(() => router.push("/(app)/finance/new"), [router]);
  const handleSeeAll = useCallback(() => router.push("/(app)/finance/history"), [router]);

  return (
    <Screen>
      <Header
          title="Finance"
          left={
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initial}</Text>
            </View>
          }
          right={<Bell size={22} color={colors.text.secondary} strokeWidth={1.5} />}
        />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.accent.primary}
          />
        }
      >
        <ProjectedEndOfMonthCard />

        <SectionHeader title="Monthly Budget" />
        <MonthlyBudgetCard totalExpense={totalExpense} />

        <SectionHeader title="Cash Flow" />
        <CashFlowChart />

        <SectionHeader
          title="Recent Transactions"
          right={
            <Pressable onPress={handleSeeAll} hitSlop={8}>
              <Text style={styles.seeAll}>See All</Text>
            </Pressable>
          }
        />
        <View style={styles.transactionsCard}>
          {recentItems.length === 0 ? (
            <Text style={styles.emptyText}>No transactions this month</Text>
          ) : (
            recentItems.map((tx, idx) => (
              <View key={tx.id}>
                {idx > 0 && <View style={styles.divider} />}
                <TransactionCard
                  transaction={tx}
                  onPress={() => router.push(`/(app)/finance/${tx.id}`)}
                />
              </View>
            ))
          )}
        </View>
      </ScrollView>

      <Pressable
        onPress={handleAdd}
        style={({ pressed }) => [styles.fab, pressed && { opacity: 0.85 }]}
      >
        <Plus size={22} color={colors.bg.canvas} strokeWidth={2.5} />
      </Pressable>
    </Screen>
  );
}

function SectionHeader({ title, right }: { title: string; right?: React.ReactNode }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 120 },

  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.accent.subtle,
    borderWidth: 1,
    borderColor: colors.accent.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    ...StyleSheet.flatten(textStyles.h3),
    fontSize: 14,
    color: colors.accent.text,
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xl,
    marginBottom: 10,
    marginTop: 8,
  },
  sectionTitle: {
    ...StyleSheet.flatten(textStyles.h2),
    fontWeight: "700",
  },
  seeAll: {
    fontSize: 13,
    fontWeight: "500",
    color: colors.accent.primary,
  },

  transactionsCard: {
    backgroundColor: colors.bg.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
    marginHorizontal: spacing.xl,
    marginBottom: 12,
    overflow: "hidden",
  },
  divider: { height: 1, backgroundColor: colors.border.default, marginHorizontal: 16 },
  emptyText: {
    fontSize: 13,
    color: colors.text.muted,
    textAlign: "center",
    paddingVertical: 20,
  },

  fab: {
    position: "absolute",
    bottom: 24,
    right: 24,
    width: 52,
    height: 52,
    borderRadius: radius.full,
    backgroundColor: colors.accent.primary,
    alignItems: "center",
    justifyContent: "center",
  },
});
