import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Banknote, Car, Monitor, ShoppingBag, Utensils, Wallet } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';

import ListItem from '@/components/ui/ListItem';
import type { Transaction } from '@/features/finance/types';
import { formatRupiah, formatShortDate } from '@/lib/utils';
import { colors, textStyles } from '@/theme';

interface TransactionCardProps {
  transaction: Transaction;
  categoryName?: string;
  showId?: boolean;
  onPress?: () => void;
}

function categoryIcon(name?: string | null): LucideIcon {
  const n = name?.toLowerCase() ?? '';
  if (n.includes('food') || n.includes('dining') || n.includes('restaurant')) return Utensils;
  if (n.includes('tech') || n.includes('electronic')) return Monitor;
  if (n.includes('income') || n.includes('salary')) return Banknote;
  if (n.includes('transport') || n.includes('travel')) return Car;
  if (n.includes('shopping')) return ShoppingBag;
  return Wallet;
}

function getCardLabels(transaction: Transaction, categoryName?: string) {
  if (transaction.merchant) {
    return {
      title: transaction.merchant,
      subtitle: categoryName ?? transaction.note ?? formatShortDate(transaction.occurred_at),
    };
  }
  if (categoryName) {
    return {
      title: categoryName,
      subtitle: transaction.note ?? formatShortDate(transaction.occurred_at),
    };
  }
  if (transaction.note) {
    return {
      title: transaction.note,
      subtitle: formatShortDate(transaction.occurred_at),
    };
  }
  return {
    title: 'Transaction',
    subtitle: formatShortDate(transaction.occurred_at),
  };
}

function TransactionCard({ transaction, categoryName, showId, onPress }: TransactionCardProps) {
  const isExpense = transaction.amount < 0;
  const Icon = categoryIcon(categoryName);
  const { title, subtitle } = getCardLabels(transaction, categoryName);
  const amountText = `${isExpense ? '−' : '+'} ${formatRupiah(Math.abs(transaction.amount))}`;
  const amountColor = isExpense ? colors.danger.text : colors.accent.primary;

  const rightElement = showId ? (
    <View style={styles.rightCol}>
      <Text style={[styles.amount, { color: amountColor }]}>{amountText}</Text>
      <Text style={styles.txnId}>ID: TXN-{transaction.id.slice(-4).toUpperCase()}</Text>
    </View>
  ) : undefined;

  return (
    <ListItem
      title={title}
      subtitle={subtitle}
      icon={Icon}
      value={showId ? undefined : amountText}
      valueColor={showId ? undefined : amountColor}
      rightElement={rightElement}
      onPress={onPress}
    />
  );
}

const styles = StyleSheet.create({
  rightCol: { alignItems: 'flex-end', gap: 4 },
  amount: { ...StyleSheet.flatten(textStyles.h3) },
  txnId: { fontSize: 10, color: colors.text.muted },
});

export default React.memo(TransactionCard);
