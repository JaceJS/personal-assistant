import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { Category } from '@/features/finance/types';
import { categoryIcon } from '@/features/finance/utils/categoryIcon';
import { formatRupiah } from '@/lib/utils';
import { colors, radius, textStyles } from '@/theme';

interface FixedExpenseItemProps {
  category: Category;
  spent: number;
  subtitle?: string;
}

function FixedExpenseItem({ category, spent, subtitle = 'This month' }: FixedExpenseItemProps) {
  const Icon = categoryIcon(category.name);

  return (
    <View style={styles.row}>
      <View style={styles.iconBox}>
        <Icon size={20} color={colors.accent.text} strokeWidth={1.5} />
      </View>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>{category.name}</Text>
        <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>
      </View>
      <Text style={styles.amount}>{formatRupiah(spent)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.accent.subtle,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  info: { flex: 1, gap: 3 },
  name: { ...StyleSheet.flatten(textStyles.h3), color: colors.text.primary },
  subtitle: { fontSize: 13, color: colors.text.muted },
  amount: { ...StyleSheet.flatten(textStyles.h3), color: colors.text.primary },
});

export default React.memo(FixedExpenseItem);
