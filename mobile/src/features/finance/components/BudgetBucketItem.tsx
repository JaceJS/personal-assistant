import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Category } from '@/features/finance/types';
import CategoryIcon from './CategoryIcon';
import { computeBucketStatus, getBucketBarWidth } from '@/features/finance/utils/budgetBucketUtils';
import type { BucketStatus } from '@/features/finance/utils/budgetBucketUtils';
import { formatRupiah } from '@/lib/utils';
import { colors, radius, textStyles } from '@/theme';
import CategoryBudgetSheet from './CategoryBudgetSheet';

const STATUS_LABELS: Record<BucketStatus, string> = {
  'no-limit': 'Tanpa Batas',
  'on-track': 'Aman',
  warning: 'Waspada',
  over: 'Melebihi',
};

const STATUS_COLORS: Record<BucketStatus, string> = {
  'no-limit': colors.text.muted,
  'on-track': colors.success.text,
  warning: colors.warning.text,
  over: colors.danger.text,
};

const BAR_COLORS: Record<BucketStatus, string> = {
  'no-limit': colors.bg.hover,
  'on-track': colors.accent.primary,
  warning: colors.warning.text,
  over: colors.danger.text,
};

interface BudgetBucketItemProps {
  category: Category;
  spent: number;
}

function BudgetBucketItem({ category, spent }: BudgetBucketItemProps) {
  const [sheetVisible, setSheetVisible] = useState(false);
  const status = computeBucketStatus(spent, category.budget_limit);
  const barPct = getBucketBarWidth(spent, category.budget_limit);
  const handlePress = useCallback(() => {
    setSheetVisible(true);
  }, []);

  const limitLabel = category.budget_limit
    ? `/ ${formatRupiah(category.budget_limit)}`
    : 'Ketuk untuk atur batas';

  return (
    <>
      <Pressable
        onPress={handlePress}
        style={({ pressed }) => [styles.item, pressed && { opacity: 0.75 }]}
      >
        <View style={styles.row}>
          <CategoryIcon
            icon={category.icon}
            color={category.color}
            size={48}
            emojiSize={24}
          />
          <View style={styles.info}>
            <Text style={styles.name} numberOfLines={1}>{category.name}</Text>
            <Text style={styles.subtitle}>{formatRupiah(spent)} {limitLabel}</Text>
          </View>
          <View style={styles.right}>
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
      </Pressable>

      <CategoryBudgetSheet
        category={category}
        isVisible={sheetVisible}
        onDismiss={() => setSheetVisible(false)}
      />
    </>
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
  info: { flex: 1, gap: 3 },
  name: { ...StyleSheet.flatten(textStyles.h3), color: colors.text.primary },
  subtitle: { fontSize: 12, color: colors.text.muted },
  right: { alignItems: 'flex-end', gap: 3 },
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
