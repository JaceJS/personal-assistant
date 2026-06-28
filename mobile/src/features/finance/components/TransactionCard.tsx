import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Banknote, Car, Monitor, ShoppingBag, Utensils, Wallet } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';

import ListItem from '@/components/ui/ListItem';
import type { Transaction } from '@/features/finance/types';
import { formatRupiah } from '@/lib/utils';
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
  const timeStr = new Date(transaction.occurred_at)
    .toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  const sourceMap: Record<string, string> = { voice: 'Suara', receipt: 'Struk' };
  const sourceLabel = sourceMap[transaction.source];
  const timeLine = sourceLabel ? `${timeStr} · ${sourceLabel}` : timeStr;

  if (transaction.merchant) {
    const extra = categoryName ?? transaction.note;
    return {
      title: transaction.merchant,
      subtitle: extra ? `${extra} · ${timeLine}` : timeLine,
    };
  }
  if (categoryName) {
    return {
      title: categoryName,
      subtitle: transaction.note ? `${transaction.note} · ${timeLine}` : timeLine,
    };
  }
  if (transaction.note) {
    return { title: transaction.note, subtitle: timeLine };
  }
  return {
    title: 'Transaksi',
    subtitle: timeStr,
  };
}

function TransactionCard({ transaction, categoryName, showId, onPress }: TransactionCardProps) {
  const isExpense = transaction.amount < 0;
  const Icon = categoryIcon(categoryName);
  const { title, subtitle } = getCardLabels(transaction, categoryName);
  const amountText = `${isExpense ? '−' : '+'} ${formatRupiah(Math.abs(transaction.amount))}`;
  const amountColor = isExpense ? colors.danger.text : colors.success.text;

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
