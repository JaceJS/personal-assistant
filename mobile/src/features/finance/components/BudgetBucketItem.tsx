import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { Category } from '@/features/finance/types';
import { categoryIcon } from '@/features/finance/utils/categoryIcon';
import { formatRupiah } from '@/lib/utils';
import { colors, radius, textStyles } from '@/theme';

type BudgetStatus = 'inactive' | 'on-track' | 'critical';

function getStatus(spent: number, totalBudget: number): BudgetStatus {
  if (spent === 0) return 'inactive';
  if (totalBudget > 0 && spent / totalBudget >= 0.3) return 'critical';
  return 'on-track';
}

const STATUS_LABELS: Record<BudgetStatus, string> = {
  inactive: 'Inactive',
  'on-track': 'On Track',
  critical: 'Critical',
};

const STATUS_COLORS: Record<BudgetStatus, string> = {
  inactive: colors.text.muted,
  'on-track': colors.success.text,
  critical: colors.danger.text,
};

const BAR_COLORS: Record<BudgetStatus, string> = {
  inactive: colors.bg.elevated,
  'on-track': colors.accent.primary,
  critical: colors.danger.text,
};

interface BudgetBucketItemProps {
  category: Category;
  spent: number;
  totalBudget: number;
}

function BudgetBucketItem({ category, spent, totalBudget }: BudgetBucketItemProps) {
  const Icon = categoryIcon(category.name);
  const status = getStatus(spent, totalBudget);
  const barPct = totalBudget > 0 ? Math.min(spent / totalBudget, 1) : 0;

  return (
    <View style={styles.item}>
      <View style={styles.row}>
        <View style={styles.iconBox}>
          <Icon size={20} color={colors.text.muted} strokeWidth={1.5} />
        </View>
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>{category.name}</Text>
          <Text style={styles.subtitle}>{formatRupiah(spent)} spent</Text>
        </View>
        <View style={styles.right}>
          <Text style={styles.amount}>{formatRupiah(spent)}</Text>
          <Text style={[styles.status, { color: STATUS_COLORS[status] }]}>
            {STATUS_LABELS[status]}
          </Text>
        </View>
      </View>
      <View style={styles.barTrack}>
        <View
          style={[
            styles.barFill,
            {
              width: `${Math.round(barPct * 100)}%` as `${number}%`,
              backgroundColor: BAR_COLORS[status],
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  item: {},
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
    backgroundColor: colors.bg.elevated,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  info: { flex: 1, gap: 3 },
  name: { ...StyleSheet.flatten(textStyles.h3), color: colors.text.primary },
  subtitle: { fontSize: 13, color: colors.text.muted },
  right: { alignItems: 'flex-end', gap: 3 },
  amount: { ...StyleSheet.flatten(textStyles.h3), color: colors.text.primary },
  status: { fontSize: 12, fontWeight: '500' },
  barTrack: {
    height: 4,
    borderRadius: radius.full,
    backgroundColor: colors.bg.elevated,
    marginHorizontal: 16,
    marginBottom: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: radius.full,
  },
});

export default React.memo(BudgetBucketItem);
