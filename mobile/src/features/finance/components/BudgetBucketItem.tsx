import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';

import type { Category } from '@/features/finance/types';
import CategoryIcon from './CategoryIcon';
import { computeBucketStatus, getBucketBarWidth } from '@/features/finance/utils/budgetBucketUtils';
import type { BucketStatus } from '@/features/finance/utils/budgetBucketUtils';
import { formatMoney } from '@/lib/format';
import { colors, radius, textStyles } from '@/theme';
import CategoryBudgetSheet from './CategoryBudgetSheet';

function statusLabel(t: TFunction, status: BucketStatus): string {
  switch (status) {
    case 'no-limit':
      return t('budget.bucket.noLimit');
    case 'on-track':
      return t('budget.bucket.onTrack');
    case 'warning':
      return t('budget.bucket.warning');
    case 'over':
      return t('budget.bucket.over');
  }
}

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
  const { t } = useTranslation();
  const [sheetVisible, setSheetVisible] = useState(false);
  const status = computeBucketStatus(spent, category.budget_limit);
  const barPct = getBucketBarWidth(spent, category.budget_limit);
  const handlePress = useCallback(() => {
    setSheetVisible(true);
  }, []);

  const limitLabel = category.budget_limit
    ? `/ ${formatMoney(category.budget_limit)}`
    : t('budget.bucket.tapToSetLimit');

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
            <Text style={styles.subtitle}>{formatMoney(spent)} {limitLabel}</Text>
          </View>
          <View style={styles.right}>
            <Text style={[styles.status, { color: STATUS_COLORS[status] }]}>
              {statusLabel(t, status)}
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
