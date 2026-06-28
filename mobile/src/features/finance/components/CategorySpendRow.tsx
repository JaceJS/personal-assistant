import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { categoryIcon } from '@/features/finance/utils/categoryIcon';
import { formatRupiah } from '@/lib/utils';
import type { CategorySpend } from '@/features/finance/utils/topCategoryUtils';
import { colors, radius, spacing, textStyles } from '@/theme';

interface CategorySpendRowProps {
  row: CategorySpend;
  onPress?: () => void;
}

const CategorySpendRow = React.memo(function CategorySpendRow({ row, onPress }: CategorySpendRowProps) {
  const Icon = categoryIcon(row.name);
  const iconColor = row.color ?? colors.accent.primary;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => pressed && { opacity: 0.7 }}
      disabled={!onPress}
    >
      <View style={styles.row}>
        <View style={[styles.iconBox, { backgroundColor: `${iconColor}22` }]}>
          <Icon size={16} color={iconColor} strokeWidth={2} />
        </View>

        <View style={styles.meta}>
          <View style={styles.topLine}>
            <Text style={styles.name} numberOfLines={1}>{row.name}</Text>
            <Text style={styles.amount}>{formatRupiah(row.total)}</Text>
          </View>
          <View style={styles.barTrack}>
            <View style={[styles.barFill, { width: `${Math.round(row.barPct * 100)}%` as `${number}%`, backgroundColor: iconColor }]} />
          </View>
        </View>

        <Text style={styles.pct}>{Math.round(row.pct * 100)}%</Text>
      </View>
    </Pressable>
  );
});

export default CategorySpendRow;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    gap: spacing.md,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  meta: { flex: 1, gap: 6 },
  topLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  name: {
    ...StyleSheet.flatten(textStyles.body),
    fontSize: 14,
    color: colors.text.primary,
    flex: 1,
    marginRight: spacing.sm,
  },
  amount: {
    ...StyleSheet.flatten(textStyles.caption),
    fontSize: 13,
    fontWeight: '600',
    color: colors.text.primary,
  },
  barTrack: {
    height: 4,
    borderRadius: radius.full,
    backgroundColor: colors.bg.elevated,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: radius.full,
    opacity: 0.8,
  },
  pct: {
    ...StyleSheet.flatten(textStyles.caption),
    fontSize: 12,
    fontWeight: '600',
    color: colors.text.muted,
    width: 36,
    textAlign: 'right',
  },
});
