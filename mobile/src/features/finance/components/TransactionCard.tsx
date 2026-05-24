import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { formatRupiah, formatShortDate } from '@/lib/utils';
import type { Transaction } from '@/features/finance/types';
import { colors, radius } from '@/theme';

interface TransactionCardProps {
  transaction: Transaction;
  onPress?: () => void;
}

function TransactionCard({ transaction, onPress }: TransactionCardProps) {
  const isExpense = transaction.amount < 0;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.dot} />
      <View style={styles.content}>
        <Text style={styles.merchant} numberOfLines={1}>
          {transaction.merchant ?? 'Transaction'}
        </Text>
        <Text style={styles.date}>{formatShortDate(transaction.occurred_at)}</Text>
      </View>
      <Text style={[styles.amount, isExpense ? styles.expense : styles.income]}>
        {isExpense ? '−' : '+'} {formatRupiah(Math.abs(transaction.amount))}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  pressed: { opacity: 0.7 },
  dot: {
    width: 8,
    height: 8,
    borderRadius: radius.full,
    backgroundColor: colors.border.strong,
    flexShrink: 0,
  },
  content: { flex: 1, gap: 2 },
  merchant: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.text.primary,
  },
  date: {
    fontSize: 12,
    fontWeight: '400',
    color: colors.text.muted,
  },
  amount: {
    fontSize: 14,
    fontWeight: '600',
  },
  expense: { color: colors.danger.text },
  income: { color: colors.success.text },
});

export default React.memo(TransactionCard);
