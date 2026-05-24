import { useCallback, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Plus, Wallet } from 'lucide-react-native';

import { Header } from '@/components/layout/Header';
import { Screen } from '@/components/layout/Screen';
import EmptyState from '@/components/ui/EmptyState';
import { SkeletonList } from '@/components/ui/Skeleton';
import TransactionCard from '@/features/finance/components/TransactionCard';
import { useTransactions } from '@/features/finance/hooks/useTransactions';
import type { Transaction } from '@/features/finance/types';
import { formatRupiah } from '@/lib/utils';
import { colors, radius, spacing } from '@/theme';

type Filter = 'all' | 'income' | 'expense';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'income', label: 'Income' },
  { key: 'expense', label: 'Expense' },
];

export default function TransactionsScreen() {
  const router = useRouter();
  const { data, isLoading, isRefetching, refetch } = useTransactions();
  const [filter, setFilter] = useState<Filter>('all');

  const allTransactions = data?.items ?? [];

  const filtered = allTransactions.filter((t) => {
    if (filter === 'income') return t.amount >= 0;
    if (filter === 'expense') return t.amount < 0;
    return true;
  });

  const totalIncome = allTransactions
    .filter((t) => t.amount >= 0)
    .reduce((s, t) => s + t.amount, 0);
  const totalExpense = allTransactions
    .filter((t) => t.amount < 0)
    .reduce((s, t) => s + Math.abs(t.amount), 0);

  const handleAdd = useCallback(() => router.push('/(app)/transactions/new'), [router]);

  const renderItem = useCallback(
    ({ item }: { item: Transaction }) => (
      <TransactionCard
        transaction={item}
        onPress={() => router.push(`/(app)/transactions/${item.id}`)}
      />
    ),
    [router],
  );

  return (
    <Screen>
      <Header title="Finance" />

      {/* Summary bar */}
      <View style={styles.summary}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Income</Text>
          <Text style={[styles.summaryAmount, { color: colors.success.text }]}>
            {formatRupiah(totalIncome)}
          </Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Expense</Text>
          <Text style={[styles.summaryAmount, { color: colors.danger.text }]}>
            {formatRupiah(totalExpense)}
          </Text>
        </View>
      </View>

      {/* Filter pills */}
      <View style={styles.filters}>
        {FILTERS.map((f) => (
          <Pressable
            key={f.key}
            onPress={() => setFilter(f.key)}
            style={[styles.pill, filter === f.key && styles.pillActive]}
          >
            <Text style={[styles.pillLabel, filter === f.key && styles.pillLabelActive]}>
              {f.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* List */}
      {isLoading ? (
        <View style={styles.listPad}>
          <SkeletonList count={5} />
        </View>
      ) : (
        <FlatList
          style={styles.list}
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={colors.accent.primary}
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon={Wallet}
              title="No transactions yet"
              subtitle='Try saying: "Add expense 50k for lunch"'
            />
          }
        />
      )}

      {/* FAB */}
      <Pressable
        onPress={handleAdd}
        style={({ pressed }) => [styles.fab, pressed && { opacity: 0.85 }]}
      >
        <Plus size={22} color={colors.bg.canvas} strokeWidth={2.5} />
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  summary: {
    flexDirection: 'row',
    marginHorizontal: spacing['2xl'],
    backgroundColor: colors.bg.surface,
    borderRadius: radius.lg,
    marginBottom: spacing.lg,
    overflow: 'hidden',
  },
  summaryItem: { flex: 1, padding: 14, gap: 4 },
  summaryDivider: { width: 1, backgroundColor: colors.border.subtle },
  summaryLabel: { fontSize: 11, fontWeight: '500', color: colors.text.muted, textTransform: 'uppercase', letterSpacing: 0.5 },
  summaryAmount: { fontSize: 16, fontWeight: '600' },

  filters: {
    flexDirection: 'row',
    paddingHorizontal: spacing['2xl'],
    gap: 8,
    marginBottom: spacing.lg,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: radius.full,
    backgroundColor: colors.bg.elevated,
    minHeight: 44,
    justifyContent: 'center',
  },
  pillActive: { backgroundColor: colors.accent.primary },
  pillLabel: { fontSize: 13, fontWeight: '500', color: colors.text.muted },
  pillLabelActive: { color: colors.bg.canvas, fontWeight: '600' },

  list: { flex: 1 },
  listPad: { paddingHorizontal: spacing['2xl'] },
  listContent: { paddingHorizontal: spacing['2xl'], gap: 8, paddingBottom: 100 },

  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 52,
    height: 52,
    borderRadius: radius.full,
    backgroundColor: colors.accent.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
