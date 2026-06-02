import { useCallback, useMemo, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Bell, Plus } from "lucide-react-native";

import { Header } from "@/components/layout/Header";
import { Screen } from "@/components/layout/Screen";
import Fab from "@/components/ui/Fab";
import CashFlowChart from "@/features/finance/components/CashFlowChart";
import MonthlyBudgetCard from "@/features/finance/components/MonthlyBudgetCard";
import ProjectedEndOfMonthCard from "@/features/finance/components/ProjectedEndOfMonthCard";
import TransactionCard from "@/features/finance/components/TransactionCard";
import { useAccounts } from "@/features/finance/hooks/useAccounts";
import { useTransactions } from "@/features/finance/hooks/useTransactions";
import { useAuthStore } from "@/stores/auth";
import { colors, radius, spacing, textStyles } from "@/theme";

const RECENT_COUNT = 3;

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export default function FinanceDashboard() {
  const router = useRouter();
  const { user } = useAuthStore();
  const initial = (user?.email?.[0] ?? "U").toUpperCase();
  const now = new Date();
  const dateFrom = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const dateTo = now.toISOString().slice(0, 10);
  const monthLabel = `${MONTH_NAMES[now.getMonth()]} ${now.getFullYear()}`;

  const { data: accountsData } = useAccounts();
  const accounts = useMemo(
    () => accountsData?.items.filter((a) => !a.is_archived) ?? [],
    [accountsData]
  );
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);

  const { data, isRefetching, refetch } = useTransactions({
    dateFrom,
    dateTo,
    limit: 200,
    ...(selectedAccountId ? { accountId: selectedAccountId } : {}),
  });
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
        subtitle={monthLabel}
        left={
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
        }
        right={<Bell size={22} color={colors.text.secondary} strokeWidth={1.5} />}
      />

      {accounts.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
          style={styles.filterScroll}
        >
          <AccountPill
            label="All"
            active={selectedAccountId === null}
            onPress={() => setSelectedAccountId(null)}
          />
          {accounts.map((a) => (
            <AccountPill
              key={a.id}
              label={a.name}
              active={selectedAccountId === a.id}
              onPress={() => setSelectedAccountId((prev) => (prev === a.id ? null : a.id))}
            />
          ))}
        </ScrollView>
      )}

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

      <Fab onPress={handleAdd} icon={Plus} accessibilityLabel="Add transaction" />
    </Screen>
  );
}

function AccountPill({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => pressed && { opacity: 0.8 }}>
      <View style={[styles.pill, active ? styles.pillActive : styles.pillInactive]}>
        <Text
          style={[styles.pillLabel, active ? styles.pillLabelActive : styles.pillLabelInactive]}
        >
          {label}
        </Text>
      </View>
    </Pressable>
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
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    ...StyleSheet.flatten(textStyles.h3),
    fontSize: 14,
    color: colors.accent.text,
  },

  filterScroll: { height: 60 },
  filterRow: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },

  pill: {
    borderRadius: radius.full,
    paddingHorizontal: spacing.lg,
    paddingVertical: 7,
  },
  pillActive: {
    backgroundColor: colors.accent.primary,
  },
  pillInactive: {
    backgroundColor: colors.bg.elevated,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  pillLabel: {
    ...StyleSheet.flatten(textStyles.caption),
    fontWeight: "500",
  },
  pillLabelActive: {
    color: colors.bg.canvas,
  },
  pillLabelInactive: {
    color: colors.text.primary,
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
});
