import { useCallback, useMemo, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Plus } from "lucide-react-native";
import { useTranslation } from "react-i18next";

import { Header } from "@/components/layout/Header";
import { Screen } from "@/components/layout/Screen";
import Fab from "@/components/ui/Fab";
import FilterPill from "@/components/ui/FilterPill";
import CashFlowChart from "@/features/finance/components/CashFlowChart";
import MonthlyBudgetCard from "@/features/finance/components/MonthlyBudgetCard";
import ProjectedEndOfMonthCard from "@/features/finance/components/ProjectedEndOfMonthCard";
import TransactionCard from "@/features/finance/components/TransactionCard";
import { useAccounts } from "@/features/finance/hooks/useAccounts";
import { useCategories } from "@/features/finance/hooks/useCategories";
import { useTransactions } from "@/features/finance/hooks/useTransactions";
import { useDisplayName } from "@/hooks/useDisplayName";
import { getMonthNames } from "@/lib/format";
import { colors, radius, spacing, textStyles } from "@/theme";

const RECENT_COUNT = 3;

export default function FinanceDashboard() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const monthNames = useMemo(() => getMonthNames("long"), [i18n.language]);
  const displayName = useDisplayName();
  const initial = (displayName[0] ?? "U").toUpperCase();
  const now = new Date();
  const dateFrom = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    '01',
  ].join('-');
  const dateTo = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('-');
  const monthLabel = `${monthNames[now.getMonth()]} ${now.getFullYear()}`;

  const { data: accountsData } = useAccounts();
  const { data: categoriesData } = useCategories();
  const accounts = useMemo(
    () => accountsData?.filter((a) => !a.is_archived) ?? [],
    [accountsData]
  );
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);

  const { data, isRefetching, refetch } = useTransactions({
    dateFrom,
    dateTo,
    limit: 200,
    ...(selectedAccountId ? { accountId: selectedAccountId } : {}),
  });
  const items = useMemo(() => data?.items ?? [], [data]);

  const totalExpense = useMemo(
    () => items.filter((t) => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0),
    [items]
  );

  const recentItems = useMemo(() => items.slice(0, RECENT_COUNT), [items]);

  const handleAdd = useCallback(() => router.push("/(app)/finance/new"), [router]);
  const handleSeeAll = useCallback(() => router.push("/(app)/finance/history"), [router]);
  const handleGoToSavings = useCallback(() => router.push("/(app)/goals"), [router]);

  return (
    <Screen>
      <Header
        title={t("settings.financeSectionLabel")}
        subtitle={monthLabel}
        left={
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
        }
      />

      {accounts.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
          style={styles.filterScroll}
        >
          <FilterPill
            label={t("categories.filterAll")}
            active={selectedAccountId === null}
            onPress={() => setSelectedAccountId(null)}
          />
          {accounts.map((a) => (
            <FilterPill
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

        <SectionHeader title={t("finance.budgetSectionTitle")} />
        <MonthlyBudgetCard totalExpense={totalExpense} />

        <SectionHeader
          title={t("finance.savingsGoalsTitle")}
          right={
            <Pressable onPress={handleGoToSavings} hitSlop={8}>
              <Text style={styles.seeAll}>{t("history.seeAllCta")}</Text>
            </Pressable>
          }
        />
        <Pressable
          onPress={handleGoToSavings}
          style={({ pressed }) => [styles.savingsEntryWrap, pressed && { opacity: 0.8 }]}
        >
          <View style={styles.savingsEntryCard}>
            <Text style={styles.savingsEntryEmoji}>🎯</Text>
            <View style={styles.savingsEntryText}>
              <Text style={styles.savingsEntryTitle}>{t("finance.savingsGoalsTitle")}</Text>
              <Text style={styles.savingsEntrySubtitle}>{t("finance.savingsGoalsSubtitle")}</Text>
            </View>
            <Text style={styles.savingsEntryChevron}>›</Text>
          </View>
        </Pressable>

        <SectionHeader title={t("finance.cashFlowTitle")} />
        <CashFlowChart />

        <SectionHeader
          title={t("history.recentTitle")}
          right={
            <Pressable onPress={handleSeeAll} hitSlop={8}>
              <Text style={styles.seeAll}>{t("history.seeAllCta")}</Text>
            </Pressable>
          }
        />
        <View style={styles.transactionsCard}>
          {recentItems.length === 0 ? (
            <Text style={styles.emptyText}>{t("home.projectedEndOfMonth.emptyText")}</Text>
          ) : (
            recentItems.map((tx, idx) => {
              const category = categoriesData?.find(c => c.id === tx.category_id);
              return (
                <View key={tx.id}>
                  {idx > 0 && <View style={styles.divider} />}
                  <TransactionCard
                    transaction={tx}
                    category={category}
                    onPress={() => router.push(`/(app)/finance/${tx.id}`)}
                  />
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      <Fab onPress={handleAdd} icon={Plus} accessibilityLabel={t("home.addTransactionA11y")} />
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
  content: { paddingBottom: 132 },

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

  savingsEntryWrap: {
    marginHorizontal: spacing.xl,
    marginBottom: 12,
  },
  savingsEntryCard: {
    backgroundColor: colors.bg.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  savingsEntryEmoji: { fontSize: 28 },
  savingsEntryText: { flex: 1 },
  savingsEntryTitle: {
    ...StyleSheet.flatten(textStyles.h3),
    color: colors.text.primary,
  },
  savingsEntrySubtitle: {
    ...StyleSheet.flatten(textStyles.caption),
    color: colors.text.muted,
    marginTop: 2,
  },
  savingsEntryChevron: {
    fontSize: 22,
    color: colors.text.muted,
    fontWeight: '300',
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
