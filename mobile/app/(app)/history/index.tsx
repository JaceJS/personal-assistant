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
import { BottomSheet } from '@/components/ui/BottomSheet';
import DatePicker from '@/components/ui/DatePicker';
import { MultiSearchableDropdown } from '@/components/ui/MultiSearchableDropdown';
import Button from '@/components/ui/Button';
import TransactionCard from '@/features/finance/components/TransactionCard';
import { useCategories } from '@/features/finance/hooks/useCategories';
import { useTransactions } from '@/features/finance/hooks/useTransactions';
import type { Transaction } from '@/features/finance/types';
import { formatRupiah, formatShortDate } from '@/lib/utils';
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
  const now = useMemo(() => new Date(), []);

  const initialYear = params.year ? Number(params.year) : now.getFullYear();
  const initialMonth = params.month !== undefined ? Number(params.month) : now.getMonth();

  const [selectedMonth, setSelectedMonth] = useState({
    year: initialYear,
    month: initialMonth,
  });
  const [activeCategoryIds, setActiveCategoryIds] = useState<string[]>(
    params.categoryId ? [params.categoryId] : []
  );
  const [query, setQuery] = useState('');

  const [isCustomDateRange, setIsCustomDateRange] = useState(false);
  const [customDateFrom, setCustomDateFrom] = useState<Date>(
    new Date(now.getFullYear(), now.getMonth(), 1)
  );
  const [customDateTo, setCustomDateTo] = useState<Date>(new Date());

  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [tempCategoryIds, setTempCategoryIds] = useState<string[]>(
    params.categoryId ? [params.categoryId] : []
  );
  const [tempIsCustom, setTempIsCustom] = useState(false);
  const [tempDateFrom, setTempDateFrom] = useState<Date>(
    new Date(now.getFullYear(), now.getMonth(), 1)
  );
  const [tempDateTo, setTempDateTo] = useState<Date>(new Date());

  const openFilter = useCallback(() => {
    setTempCategoryIds(activeCategoryIds);
    setTempIsCustom(isCustomDateRange);
    setTempDateFrom(customDateFrom);
    setTempDateTo(customDateTo);
    setIsFilterOpen(true);
  }, [activeCategoryIds, isCustomDateRange, customDateFrom, customDateTo]);

  const applyFilter = useCallback(() => {
    setActiveCategoryIds(tempCategoryIds);
    setIsCustomDateRange(tempIsCustom);
    setCustomDateFrom(tempDateFrom);
    setCustomDateTo(tempDateTo);
    setIsFilterOpen(false);
  }, [tempCategoryIds, tempIsCustom, tempDateFrom, tempDateTo]);

  const resetFilter = useCallback(() => {
    const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const today = new Date();
    setTempCategoryIds([]);
    setTempIsCustom(false);
    setTempDateFrom(startOfCurrentMonth);
    setTempDateTo(today);
    setActiveCategoryIds([]);
    setIsCustomDateRange(false);
    setCustomDateFrom(startOfCurrentMonth);
    setCustomDateTo(today);
    setIsFilterOpen(false);
  }, [now]);

  const dateFrom = isCustomDateRange
    ? [
        customDateFrom.getFullYear(),
        String(customDateFrom.getMonth() + 1).padStart(2, '0'),
        String(customDateFrom.getDate()).padStart(2, '0'),
      ].join('-')
    : [
        selectedMonth.year,
        String(selectedMonth.month + 1).padStart(2, '0'),
        '01',
      ].join('-');

  const lastDay = new Date(selectedMonth.year, selectedMonth.month + 1, 0).getDate();

  const dateTo = isCustomDateRange
    ? [
        customDateTo.getFullYear(),
        String(customDateTo.getMonth() + 1).padStart(2, '0'),
        String(customDateTo.getDate()).padStart(2, '0'),
      ].join('-')
    : [
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
    let items = activeCategoryIds.length > 0
      ? allItems.filter((t) => t.category_id && activeCategoryIds.includes(t.category_id))
      : allItems;
    if (q) {
      items = items.filter(
        (t) => t.merchant?.toLowerCase().includes(q) || t.note?.toLowerCase().includes(q),
      );
    }
    return [...items].sort((a, b) => b.occurred_at.localeCompare(a.occurred_at));
  }, [allItems, query, activeCategoryIds]);

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
        <Pressable onPress={openFilter}>
          <View style={[styles.filterBtn, (activeCategoryIds.length > 0 || isCustomDateRange) && styles.filterBtnActive]}>
            <SlidersHorizontal
              size={18}
              color={(activeCategoryIds.length > 0 || isCustomDateRange) ? colors.bg.canvas : colors.text.primary}
              strokeWidth={2}
            />
          </View>
        </Pressable>
      </View>

      {activeCategoryIds.length > 0 && (
        <View style={styles.filterChipRow}>
          {activeCategoryIds.map((id) => {
            const cat = categoriesData?.find((c) => c.id === id);
            if (!cat) return null;
            return (
              <View key={id} style={styles.filterChip}>
                <Text style={styles.filterChipText}>
                  {cat.icon ? `${cat.icon} ` : ""}{cat.name}
                </Text>
                <Pressable hitSlop={8} onPress={() => setActiveCategoryIds(activeCategoryIds.filter((x) => x !== id))}>
                  <Text style={styles.filterChipClear}>✕</Text>
                </Pressable>
              </View>
            );
          })}
        </View>
      )}

      <View style={styles.rangeRow}>
        {isCustomDateRange ? (
          <Pressable style={styles.monthNav} hitSlop={8} onPress={openFilter}>
            <Text style={styles.monthNavText}>
              {formatShortDate(customDateFrom)} − {formatShortDate(customDateTo)}
            </Text>
          </Pressable>
        ) : (
          <Pressable style={styles.monthNav} hitSlop={8} onPress={goBack}>
            <ChevronLeft size={16} color={colors.text.secondary} strokeWidth={2} />
            <Text style={styles.monthNavText}>
              {MONTH_NAMES[selectedMonth.month].slice(0, 3)} {selectedMonth.year}
            </Text>
            <Pressable hitSlop={8} onPress={goForward} style={{ opacity: canGoForward ? 1 : 0.3 }}>
              <ChevronRight size={16} color={colors.text.secondary} strokeWidth={2} />
            </Pressable>
          </Pressable>
        )}
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

      <BottomSheet isVisible={isFilterOpen} onDismiss={() => setIsFilterOpen(false)}>
        <View style={styles.sheetContent}>
          <Text style={styles.sheetTitle}>Filter Transaksi</Text>
          {/* Category Filter Section */}
          <View style={styles.filterSection}>
            <MultiSearchableDropdown
              label="Kategori"
              placeholder="Semua Kategori"
              items={categoriesData?.filter((c) => !c.is_archived).map((cat) => ({
                id: cat.id,
                name: cat.name,
                icon: cat.icon ?? undefined,
              })) ?? []}
              selectedIds={tempCategoryIds}
              onSelect={setTempCategoryIds}
            />
          </View>

          {/* Date Range Selection Section */}
          <View style={styles.filterSection}>
            <Text style={styles.filterSectionLabel}>Rentang Waktu</Text>
            <View style={styles.toggleContainer}>
              <Pressable
                onPress={() => setTempIsCustom(false)}
                style={styles.toggleBtnWrapper}
              >
                <View style={!tempIsCustom ? [styles.toggleBtn, styles.toggleBtnActive] : styles.toggleBtn}>
                  <Text style={!tempIsCustom ? [styles.toggleText, styles.toggleTextActive] : styles.toggleText}>
                    Bulanan
                  </Text>
                </View>
              </Pressable>
              <Pressable
                onPress={() => setTempIsCustom(true)}
                style={styles.toggleBtnWrapper}
              >
                <View style={tempIsCustom ? [styles.toggleBtn, styles.toggleBtnActive] : styles.toggleBtn}>
                  <Text style={tempIsCustom ? [styles.toggleText, styles.toggleTextActive] : styles.toggleText}>
                    Kustom
                  </Text>
                </View>
              </Pressable>
            </View>
          </View>

          {tempIsCustom && (
            <View style={styles.datePickerRow}>
              <View style={styles.datePickerCol}>
                <DatePicker
                  label="Dari Tanggal"
                  value={tempDateFrom}
                  onChange={setTempDateFrom}
                />
              </View>
              <View style={styles.datePickerCol}>
                <DatePicker
                  label="Sampai Tanggal"
                  value={tempDateTo}
                  onChange={setTempDateTo}
                />
              </View>
            </View>
          )}

          {/* Actions footer */}
          <View style={styles.footerButtons}>
            <View style={styles.footerBtnWrapper}>
              <Button label="Reset" variant="ghost" onPress={resetFilter} fullWidth />
            </View>
            <View style={styles.footerBtnWrapper}>
              <Button label="Terapkan" onPress={applyFilter} fullWidth />
            </View>
          </View>
        </View>
      </BottomSheet>
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
  filterBtnActive: {
    backgroundColor: colors.accent.primary,
    borderColor: colors.accent.primary,
  },

  pillsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: 4,
  },
  filterPill: {
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.bg.canvas,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterPillActive: {
    backgroundColor: colors.accent.primary,
    borderColor: colors.accent.primary,
  },
  filterPillText: {
    ...StyleSheet.flatten(textStyles.caption),
    fontSize: 13,
    fontWeight: '500',
    color: colors.text.secondary,
  },
  filterPillTextActive: {
    color: colors.bg.canvas,
    fontWeight: '600',
  },

  filterSection: {
    gap: spacing.sm,
  },
  filterSectionLabel: {
    ...StyleSheet.flatten(textStyles.caption),
    fontSize: 13,
    fontWeight: '600',
    color: colors.text.muted,
  },

  toggleContainer: {
    flexDirection: "row",
    backgroundColor: colors.bg.surface,
    borderRadius: radius.md,
    padding: 4,
    marginBottom: spacing.xs,
    overflow: "hidden",
  },
  toggleBtnWrapper: {
    flex: 1,
    borderRadius: radius.sm,
    overflow: "hidden",
  },
  toggleBtn: {
    paddingVertical: spacing.md,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.sm,
    width: "100%",
  },
  toggleBtnActive: {
    backgroundColor: colors.accent.primary,
  },
  toggleText: {
    ...StyleSheet.flatten(textStyles.h3),
    color: colors.text.muted,
  },
  toggleTextActive: {
    color: colors.bg.canvas,
    fontWeight: "600",
  },

  datePickerRow: {
    flexDirection: 'row',
    gap: spacing.md,
    width: '100%',
  },
  datePickerCol: {
    flex: 1,
  },

  sheetContent: {
    paddingHorizontal: spacing["2xl"],
    paddingTop: spacing.sm,
    gap: spacing.lg,
  },
  sheetTitle: {
    ...StyleSheet.flatten(textStyles.h2),
    color: colors.text.primary,
    textAlign: "center",
    marginBottom: spacing.xs,
  },

  footerButtons: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  footerBtnWrapper: {
    flex: 1,
  },

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
    flexWrap: 'wrap',
    gap: 8,
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
