import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';

import ListItem from '@/components/ui/ListItem';
import CategoryIcon from './CategoryIcon';
import type { Category, Transaction } from '@/features/finance/types';
import { formatMoney, formatTime } from '@/lib/format';
import { colors, textStyles } from '@/theme';

interface TransactionCardProps {
  transaction: Transaction;
  category?: Category;
  showId?: boolean;
  onPress?: () => void;
}

function getCardLabels(t: TFunction, transaction: Transaction, categoryName?: string) {
  const timeStr = formatTime(transaction.occurred_at);
  const sourceLabel =
    transaction.source === 'voice'
      ? t('ai.chatBubble.typeVoice')
      : transaction.source === 'receipt'
        ? t('ai.chatBubble.typeReceipt')
        : undefined;
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
  return { title: t('transaction.card.otherFallback'), subtitle: timeStr };
}

function TransactionCard({ transaction, category, showId, onPress }: TransactionCardProps) {
  const { t } = useTranslation();
  const isExpense = transaction.amount < 0;
  const { title, subtitle } = getCardLabels(t, transaction, category?.name);
  const amountText = `${isExpense ? '−' : '+'} ${formatMoney(Math.abs(transaction.amount))}`;
  const amountColor = isExpense ? colors.danger.text : colors.success.text;

  const emoji = category?.icon ?? (isExpense ? '💸' : '💰');
  const tintColor = category?.color ?? (isExpense ? colors.danger.text : colors.success.text);

  const emojiCircle = (
    <CategoryIcon
      icon={emoji}
      color={tintColor}
      size={44}
      emojiSize={22}
    />
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
  rightCol: { alignItems: 'flex-end', gap: 4 },
  amount: { ...StyleSheet.flatten(textStyles.h3) },
  txnId: { fontSize: 10, color: colors.text.muted },
});

export default React.memo(TransactionCard);
