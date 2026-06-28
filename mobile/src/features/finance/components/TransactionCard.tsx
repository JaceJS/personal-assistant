import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import ListItem from '@/components/ui/ListItem';
import type { Category, Transaction } from '@/features/finance/types';
import { formatRupiah } from '@/lib/utils';
import { colors, textStyles } from '@/theme';

interface TransactionCardProps {
  transaction: Transaction;
  category?: Category;
  showId?: boolean;
  onPress?: () => void;
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
  return { title: 'Other', subtitle: timeStr };
}

function TransactionCard({ transaction, category, showId, onPress }: TransactionCardProps) {
  const isExpense = transaction.amount < 0;
  const { title, subtitle } = getCardLabels(transaction, category?.name);
  const amountText = `${isExpense ? '−' : '+'} ${formatRupiah(Math.abs(transaction.amount))}`;
  const amountColor = isExpense ? colors.danger.text : colors.success.text;

  const emoji = category?.icon ?? (isExpense ? '💸' : '💰');
  const tintColor = category?.color ?? (isExpense ? colors.danger.text : colors.success.text);

  const emojiCircle = (
    <View style={[styles.emojiCircle, { backgroundColor: `${tintColor}28` }]}>
      <Text style={styles.emojiText}>{emoji}</Text>
    </View>
  );

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
      leftElement={emojiCircle}
      value={showId ? undefined : amountText}
      valueColor={showId ? undefined : amountColor}
      rightElement={rightElement}
      onPress={onPress}
    />
  );
}

const styles = StyleSheet.create({
  emojiCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  emojiText: { fontSize: 22, lineHeight: 26 },
  rightCol: { alignItems: 'flex-end', gap: 4 },
  amount: { ...StyleSheet.flatten(textStyles.h3) },
  txnId: { fontSize: 10, color: colors.text.muted },
});

export default React.memo(TransactionCard);
