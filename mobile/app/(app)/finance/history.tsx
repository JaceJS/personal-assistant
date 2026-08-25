import { useCallback, useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
  SlidersHorizontal,
  Wallet,
} from "lucide-react-native";
import { useTranslation } from "react-i18next";

import { Header } from "@/components/layout/Header";
import { Screen } from "@/components/layout/Screen";
import EmptyState from "@/components/ui/EmptyState";
import Fab from "@/components/ui/Fab";
import { SkeletonList } from "@/components/ui/Skeleton";
import { useDelayedLoading } from "@/hooks/useDelayedLoading";
import TransactionCard from "@/features/finance/components/TransactionCard";
import { useCategories } from "@/features/finance/hooks/useCategories";
import { useTransactions } from "@/features/finance/hooks/useTransactions";
import type { Transaction } from "@/features/finance/types";
import { computeWeeklySummary } from "@/features/finance/utils/weeklySummary";
import { formatDateLabel, formatMoney, getMonthNames, toYmd } from "@/lib/format";
import { colors, radius, spacing, textStyles } from "@/theme";

type ListRow =
  | { type: "header"; key: string; label: string; income: number; expense: number }
  | { type: "item"; key: string; data: Transaction };

export default function HistoryScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const monthNames = useMemo(() => getMonthNames("long"), [i18n.language]);
  const now = new Date();

  const [selectedMonth, setSelectedMonth] = useState({
    year: now.getFullYear(),
    month: now.getMonth(),
  });
  const [query, setQuery] = useState("");

  const dateFrom = [
    selectedMonth.year,
    String(selectedMonth.month + 1).padStart(2, '0'),
    '01',
  ].join('-');
  const lastDay = new Date(selectedMonth.year, selectedMonth.month + 1, 0).getDate();
  const dateTo = [
    selectedMonth.year,
    String(selectedMonth.month + 1).padStart(2, '0'),
    String(lastDay).padStart(2, '0'),
  ].join('-');

  const canGoForward =
    selectedMonth.year < now.getFullYear() ||
    (selectedMonth.year === now.getFullYear() && selectedMonth.month < now.getMonth());

  function goBack() {
    const d = new Date(selectedMonth.year, selectedMonth.month - 1, 1);
    setSelectedMonth({ year: d.getFullYear(), month: d.getMonth() });
  }

  function goForward() {
    if (!canGoForward) return;
    const d = new Date(selectedMonth.year, selectedMonth.month + 1, 1);
    setSelectedMonth({ year: d.getFullYear(), month: d.getMonth() });
  }

  const { data, isLoading, isRefetching, refetch } = useTransactions({
    dateFrom,
    dateTo,
    limit: 200,
  });
  const allItems = useMemo(() => data?.items ?? [], [data]);
  const { data: categoriesData } = useCategories();
  const showSkeleton = useDelayedLoading(isLoading);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allItems;
    return allItems.filter(
      (t) => t.merchant?.toLowerCase().includes(q) || t.note?.toLowerCase().includes(q)
    );
  }, [allItems, query]);

  const periodTotal = useMemo(() => filtered.reduce((s, t) => s + t.amount, 0), [filtered]);

  const groupedRows = useMemo((): ListRow[] => {
    // filtered is already sorted by occurred_at desc, so same-day transactions
    // are contiguous — a single grouping pass keeps that order intact.
    const byDate = new Map<string, Transaction[]>();
    for (const t of filtered) {
      const dateKey = toYmd(new Date(t.occurred_at));
      const group = byDate.get(dateKey);
      if (group) group.push(t);
      else byDate.set(dateKey, [t]);
    }

    const rows: ListRow[] = [];
    for (const [dateKey, group] of byDate) {
      const { income, expense } = computeWeeklySummary(group);
      rows.push({ type: "header", key: `h-${dateKey}`, label: formatDateLabel(dateKey), income, expense });
      for (const t of group) rows.push({ type: "item", key: t.id, data: t });
    }
    return rows;
  }, [filtered]);

  const renderItem = useCallback(
    ({ item }: { item: ListRow }) => {
      if (item.type === "header") {
        return (
          <View style={styles.dateHeaderRow}>
            <Text style={styles.dateHeader} numberOfLines={1}>{item.label}</Text>
            <View style={styles.dateHeaderTotals}>
              {item.income > 0 && (
                <Text style={[styles.dateHeaderTotal, { color: colors.success.text }]}>
                  +{formatMoney(item.income)}
                </Text>
              )}
              {item.expense > 0 && (
                <Text style={[styles.dateHeaderTotal, { color: colors.danger.text }]}>
                  −{formatMoney(item.expense)}
                </Text>
              )}
            </View>
          </View>
        );
      }
      const category = categoriesData?.find(c => c.id === item.data.category_id);
      return (
        <View style={styles.txCard}>
          <TransactionCard
            transaction={item.data}
            category={category}
            showId
            onPress={() => router.push(`/(app)/finance/${item.data.id}`)}
          />
        </View>
      );
    },
    [router, categoriesData]
  );

  const totalIsNegative = periodTotal < 0;

  return (
    <Screen>
      <Header title={t("history.simpleTitle")} onBack={() => router.back()} />

      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Search size={16} color={colors.text.muted} strokeWidth={2} />
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder={t("history.searchPlaceholder")}
            placeholderTextColor={colors.text.muted}
          />
        </View>
        <View style={[styles.filterBtn, styles.filterBtnDisabled]}>
          <SlidersHorizontal size={18} color={colors.text.muted} strokeWidth={2} />
        </View>
      </View>

      <View style={styles.rangeRow}>
        <Pressable style={styles.monthNav} hitSlop={8} onPress={goBack}>
          <ChevronLeft size={16} color={colors.text.secondary} strokeWidth={2} />
          <Text style={styles.monthNavText}>
            {monthNames[selectedMonth.month].slice(0, 3)} {selectedMonth.year}
          </Text>
          <Pressable hitSlop={8} onPress={goForward} style={{ opacity: canGoForward ? 1 : 0.3 }}>
            <ChevronRight size={16} color={colors.text.secondary} strokeWidth={2} />
          </Pressable>
        </Pressable>
        <Text
          style={[
            styles.periodTotal,
            { color: totalIsNegative ? colors.danger.text : colors.success.text },
          ]}
        >
          {t("history.totalPrefix")}: {totalIsNegative ? "−" : "+"}
          {formatMoney(Math.abs(periodTotal))}
        </Text>
      </View>

      <FlatList
        style={styles.list}
        data={showSkeleton ? [] : groupedRows}
        keyExtractor={(item) => item.key}
        renderItem={renderItem}
        ListEmptyComponent={
          showSkeleton ? (
            <View style={styles.listPad}>
              <SkeletonList count={5} />
            </View>
          ) : (
            <EmptyState
              icon={Wallet}
              title={t("history.emptyTitle")}
              subtitle={t("history.emptySubtitle")}
            />
          )
        }
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.accent.primary}
          />
        }
      />

      <Fab
        onPress={() => router.push("/(app)/finance/new")}
        icon={Plus}
        accessibilityLabel={t("home.addTransactionA11y")}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
    gap: 10,
    marginBottom: 10,
  },
  searchBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.bg.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
    paddingHorizontal: 14,
    paddingVertical: 4,
    gap: 10,
  },
  searchInput: {
    ...StyleSheet.flatten(textStyles.body),
    flex: 1,
    fontSize: 14,
  },
  filterBtn: {
    width: 48,
    height: 48,
    borderRadius: radius.lg,
    backgroundColor: colors.bg.elevated,
    borderWidth: 1,
    borderColor: colors.border.default,
    alignItems: "center",
    justifyContent: "center",
  },
  filterBtnDisabled: {
    opacity: 0.35,
  },

  rangeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xl,
    marginBottom: 12,
  },
  monthNav: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.bg.elevated,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border.default,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  monthNavText: { ...StyleSheet.flatten(textStyles.caption), fontSize: 13, fontWeight: "500", color: colors.text.primary },
  periodTotal: { ...StyleSheet.flatten(textStyles.caption), fontSize: 13, fontWeight: "600" },

  dateHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xl,
    paddingTop: 20,
    paddingBottom: 10,
    gap: spacing.sm,
  },
  dateHeader: {
    ...StyleSheet.flatten(textStyles.h2),
    fontSize: 16,
    fontWeight: "700",
    color: colors.accent.text,
    flexShrink: 1,
  },
  dateHeaderTotals: {
    flexDirection: "row",
    gap: spacing.sm,
    flexShrink: 0,
  },
  dateHeaderTotal: {
    ...StyleSheet.flatten(textStyles.caption),
    fontSize: 12,
    fontWeight: "600",
  },
  txCard: {
    marginHorizontal: spacing.xl,
    marginBottom: 8,
    backgroundColor: colors.bg.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
    overflow: "hidden",
  },

  listPad: { paddingHorizontal: spacing.xl },
  list: { flex: 1 },
  listContent: { paddingBottom: 100 },

});
