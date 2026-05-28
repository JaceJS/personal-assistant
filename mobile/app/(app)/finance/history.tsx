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

import { Header } from "@/components/layout/Header";
import { Screen } from "@/components/layout/Screen";
import EmptyState from "@/components/ui/EmptyState";
import { SkeletonList } from "@/components/ui/Skeleton";
import TransactionCard from "@/features/finance/components/TransactionCard";
import { useTransactions } from "@/features/finance/hooks/useTransactions";
import type { Transaction } from "@/features/finance/types";
import { formatRupiah } from "@/lib/utils";
import { colors, radius, spacing } from "@/theme";

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

type ListRow =
  | { type: "header"; key: string; label: string }
  | { type: "item"; key: string; data: Transaction };

function formatDateLabel(dateStr: string): string {
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
  if (dateStr === today) return "Today";
  if (dateStr === yesterday) return "Yesterday";
  return new Date(dateStr).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
  });
}

export default function HistoryScreen() {
  const router = useRouter();
  const now = new Date();

  const [selectedMonth, setSelectedMonth] = useState({
    year: now.getFullYear(),
    month: now.getMonth(),
  });
  const [query, setQuery] = useState("");

  const dateFrom = new Date(selectedMonth.year, selectedMonth.month, 1).toISOString().slice(0, 10);
  const dateTo = new Date(selectedMonth.year, selectedMonth.month + 1, 0)
    .toISOString()
    .slice(0, 10);

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
  const allItems = data?.items ?? [];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allItems;
    return allItems.filter(
      (t) => t.merchant?.toLowerCase().includes(q) || t.note?.toLowerCase().includes(q)
    );
  }, [allItems, query]);

  const periodTotal = useMemo(() => filtered.reduce((s, t) => s + t.amount, 0), [filtered]);

  const groupedRows = useMemo((): ListRow[] => {
    const rows: ListRow[] = [];
    let lastDate = "";
    filtered.forEach((t) => {
      const dateKey = t.occurred_at.slice(0, 10);
      if (dateKey !== lastDate) {
        rows.push({ type: "header", key: `h-${dateKey}`, label: formatDateLabel(dateKey) });
        lastDate = dateKey;
      }
      rows.push({ type: "item", key: t.id, data: t });
    });
    return rows;
  }, [filtered]);

  const renderItem = useCallback(
    ({ item }: { item: ListRow }) => {
      if (item.type === "header") {
        return <Text style={styles.dateHeader}>{item.label}</Text>;
      }
      return (
        <View style={styles.txCard}>
          <TransactionCard
            transaction={item.data}
            showId
            onPress={() => router.push(`/(app)/finance/${item.data.id}`)}
          />
        </View>
      );
    },
    [router]
  );

  const totalIsNegative = periodTotal < 0;

  return (
    <Screen>
      <Header title="History" />

      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Search size={16} color={colors.text.muted} strokeWidth={2} />
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="Search transactions..."
            placeholderTextColor={colors.text.muted}
          />
        </View>
        <View style={styles.filterBtn}>
          <SlidersHorizontal size={18} color={colors.text.secondary} strokeWidth={2} />
        </View>
      </View>

      <View style={styles.rangeRow}>
        <Pressable style={styles.monthNav} hitSlop={8} onPress={goBack}>
          <ChevronLeft size={16} color={colors.text.secondary} strokeWidth={2} />
          <Text style={styles.monthNavText}>
            {MONTH_NAMES[selectedMonth.month].slice(0, 3)} {selectedMonth.year}
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
          Total: {totalIsNegative ? "−" : "+"}
          {formatRupiah(Math.abs(periodTotal))}
        </Text>
      </View>

      <FlatList
        style={styles.list}
        data={isLoading ? [] : groupedRows}
        keyExtractor={(item) => item.key}
        renderItem={renderItem}
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.listPad}>
              <SkeletonList count={5} />
            </View>
          ) : (
            <EmptyState
              icon={Wallet}
              title="No transactions"
              subtitle="Nothing recorded this month"
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

      <Pressable
        onPress={() => router.push("/(app)/finance/new")}
        style={({ pressed }) => [styles.fab, pressed && { opacity: 0.85 }]}
      >
        <Plus size={22} color={colors.bg.canvas} strokeWidth={2.5} />
      </Pressable>
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
    flex: 1,
    fontSize: 14,
    color: colors.text.primary,
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
  monthNavText: { fontSize: 13, fontWeight: "500", color: colors.text.primary },
  periodTotal: { fontSize: 13, fontWeight: "600" },

  dateHeader: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.accent.text,
    paddingHorizontal: spacing.xl,
    paddingTop: 20,
    paddingBottom: 10,
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
