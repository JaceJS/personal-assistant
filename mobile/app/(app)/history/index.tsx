import { useCallback, useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
  SlidersHorizontal,
  Wallet,
} from 'lucide-react-native';

import { Header } from '@/components/layout/Header';
import { Screen } from '@/components/layout/Screen';
import EmptyState from '@/components/ui/EmptyState';
import Fab from '@/components/ui/Fab';
import { SkeletonList } from '@/components/ui/Skeleton';
import TransactionCard from '@/features/finance/components/TransactionCard';
import { useCategories } from '@/features/finance/hooks/useCategories';
import { useTransactions } from '@/features/finance/hooks/useTransactions';
import type { Transaction } from '@/features/finance/types';
import { formatRupiah } from '@/lib/utils';
import { colors, radius, spacing, textStyles } from '@/theme';

const MONTH_NAMES = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

type ListRow =
  | { type: 'header'; key: string; label: string }
  | { type: 'item'; key: string; data: Transaction };

function formatDateLabel(dateStr: string): string {
  const now = new Date();
  const today = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('-');

  const yesterdayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  const yesterday = [
    yesterdayDate.getFullYear(),
    String(yesterdayDate.getMonth() + 1).padStart(2, '0'),
    String(yesterdayDate.getDate()).padStart(2, '0'),
  ].join('-');

  const [year, month, day] = dateStr.split('-').map(Number);
  const dateObj = new Date(year, month - 1, day);
  const fullDate = dateObj.toLocaleDateString('id-ID', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  if (dateStr === today) return `Hari ini - ${fullDate}`;
  if (dateStr === yesterday) return `Kemarin - ${fullDate}`;
  return fullDate;
}

export default function AktivitasScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ categoryId?: string; year?: string; month?: string }>();
  const now = new Date();

  const initialYear = params.year ? Number(params.year) : now.getFullYear();
  const initialMonth = params.month !== undefined ? Number(params.month) : now.getMonth();

  const [selectedMonth, setSelectedMonth] = useState({
    year: initialYear,
    month: initialMonth,
  });
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(
    params.categoryId ?? null,
  );
  const [query, setQuery] = useState('');

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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let items = activeCategoryId
      ? allItems.filter((t) => t.category_id === activeCategoryId)
      : allItems;
    if (q) {
      items = items.filter(
        (t) => t.merchant?.toLowerCase().includes(q) || t.note?.toLowerCase().includes(q),
      );
    }
    return [...items].sort((a, b) => b.occurred_at.localeCompare(a.occurred_at));
  }, [allItems, query, activeCategoryId]);

  const periodTotal = useMemo(() => filtered.reduce((s, t) => s + t.amount, 0), [filtered]);

  const groupedRows = useMemo((): ListRow[] => {
    const rows: ListRow[] = [];
    let lastDate = '';
    filtered.forEach((t) => {
      const dateKey = t.occurred_at.slice(0, 10);
      if (dateKey !== lastDate) {
        rows.push({ type: 'header', key: `h-${dateKey}`, label: formatDateLabel(dateKey) });
        lastDate = dateKey;
      }
      rows.push({ type: 'item', key: t.id, data: t });
    });
    return rows;
  }, [filtered]);

  const renderItem = useCallback(
    ({ item }: { item: ListRow }) => {
      if (item.type === 'header') {
        return <Text style={styles.dateHeader}>{item.label}</Text>;
      }
      const category = categoriesData?.find(c => c.id === item.data.category_id);
      return (
        <View style={styles.txCard}>
          <TransactionCard
            transaction={item.data}
            category={category}
            onPress={() => router.push({ pathname: `/(app)/finance/${item.data.id}`, params: { from: 'activity' } })}
          />
        </View>
      );
    },
    [router, categoriesData],
  );

  const totalIsNegative = periodTotal < 0;



  return (
    <Screen>
      <Header title="Aktivitas" />

      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Search size={16} color={colors.text.muted} strokeWidth={2} />
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="Cari transaksi..."
            placeholderTextColor={colors.text.muted}
          />
        </View>
        <View style={[styles.filterBtn, styles.filterBtnDisabled]}>
          <SlidersHorizontal size={18} color={colors.text.muted} strokeWidth={2} />
        </View>
      </View>

      {activeCategoryId && (
        <View style={styles.filterChipRow}>
          <View style={styles.filterChip}>
            <Text style={styles.filterChipText}>
              {categoriesData?.find((c) => c.id === activeCategoryId)?.name ?? 'Kategori'}
            </Text>
            <Pressable hitSlop={8} onPress={() => setActiveCategoryId(null)}>
              <Text style={styles.filterChipClear}>✕</Text>
            </Pressable>
          </View>
        </View>
      )}

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
          Total: {totalIsNegative ? '−' : '+'}
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
              title="Belum ada transaksi"
              subtitle="Belum ada catatan bulan ini"
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
        onPress={() => router.push({ pathname: "/(app)/finance/new", params: { from: "activity" } })}
        icon={Plus}
        accessibilityLabel="Add transaction"
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    gap: 10,
    marginBottom: 10,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBtnDisabled: { opacity: 0.35 },

  rangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    marginBottom: 12,
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.bg.elevated,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border.default,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  monthNavText: {
    ...StyleSheet.flatten(textStyles.caption),
    fontSize: 13,
    fontWeight: '500',
    color: colors.text.primary,
  },
  periodTotal: {
    ...StyleSheet.flatten(textStyles.caption),
    fontSize: 13,
    fontWeight: '600',
  },

  dateHeader: {
    ...StyleSheet.flatten(textStyles.h2),
    fontSize: 16,
    fontWeight: '700',
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
    overflow: 'hidden',
  },

  listPad: { paddingHorizontal: spacing.xl },
  list: { flex: 1 },
  listContent: { paddingBottom: 100 },

  filterChipRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.xl,
    marginBottom: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.accent.subtle,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.accent.border,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  filterChipText: {
    ...StyleSheet.flatten(textStyles.caption),
    fontSize: 12,
    fontWeight: '500',
    color: colors.accent.text,
  },
  filterChipClear: {
    fontSize: 11,
    color: colors.accent.text,
    fontWeight: '600',
  },
});
