import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { List } from 'lucide-react-native';

import EmptyState from '@/components/ui/EmptyState';
import { SkeletonList } from '@/components/ui/Skeleton';
import TransactionCard from '@/features/finance/components/TransactionCard';
import type { Transaction } from '@/features/finance/types';
import { colors, radius } from '@/theme';

interface RecentTransactionsProps {
  items: Transaction[];
  isLoading: boolean;
  onSeeAll: () => void;
  onPress: (id: string) => void;
}

export default function RecentTransactions({ items, isLoading, onSeeAll, onPress }: RecentTransactionsProps) {
  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Text style={styles.title}>Recent Transactions</Text>
        <Pressable onPress={onSeeAll}>
          <Text style={styles.seeAll}>See All</Text>
        </Pressable>
      </View>

      {isLoading ? (
        <SkeletonList count={3} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={List}
          title="No transactions yet"
          subtitle="Start tracking your spending"
        />
      ) : (
        <View style={styles.list}>
          {items.map((tx, i) => (
            <React.Fragment key={tx.id}>
              <TransactionCard
                transaction={tx}
                onPress={() => onPress(tx.id)}
              />
              {i < items.length - 1 && <View style={styles.divider} />}
            </React.Fragment>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { paddingHorizontal: 20 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: { fontSize: 16, fontWeight: '600', color: colors.text.primary },
  seeAll: { fontSize: 13, color: colors.accent.primary },
  list: {
    backgroundColor: colors.bg.surface,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  divider: { height: 1, backgroundColor: colors.border.subtle },
});
