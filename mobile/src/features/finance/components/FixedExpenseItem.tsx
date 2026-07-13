import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import type { Category } from '@/features/finance/types';
import CategoryIcon from './CategoryIcon';
import { formatMoney } from '@/lib/format';
import { colors, textStyles } from '@/theme';
import CategoryBudgetSheet from './CategoryBudgetSheet';

interface FixedExpenseItemProps {
  category: Category;
  spent: number;
}

function FixedExpenseItem({ category, spent }: FixedExpenseItemProps) {
  const { t } = useTranslation();
  const [sheetVisible, setSheetVisible] = useState(false);

  const limit = category.budget_limit ?? 0;

  let badgeText = t('budget.fixed.unpaid');
  let badgeStyle: { backgroundColor: string } = styles.badgePending;
  let badgeTextStyle: { color: string } = { color: colors.text.secondary };

  if (limit > 0) {
    if (spent === 0) {
      badgeText = t('budget.fixed.unpaid');
      badgeStyle = styles.badgePending;
      badgeTextStyle = { color: colors.text.secondary };
    } else if (spent < limit) {
      badgeText = t('budget.fixed.partial', { amount: formatMoney(limit - spent) });
      badgeStyle = styles.badgePartial;
      badgeTextStyle = { color: colors.warning.text };
    } else {
      badgeText = t('budget.fixed.paid');
      badgeStyle = styles.badgePaid;
      badgeTextStyle = { color: colors.success.text };
    }
  } else {
    if (spent === 0) {
      badgeText = t('budget.fixed.unpaid');
      badgeStyle = styles.badgePending;
      badgeTextStyle = { color: colors.text.secondary };
    } else {
      badgeText = t('budget.fixed.paidGeneric');
      badgeStyle = styles.badgePaid;
      badgeTextStyle = { color: colors.success.text };
    }
  }

  const committedLabel = limit
    ? t('budget.fixed.committedLabel', { amount: formatMoney(limit) })
    : t('budget.fixed.noAmountYet');

  const handlePress = useCallback(() => {
    setSheetVisible(true);
  }, []);

  return (
    <>
      <Pressable
        onPress={handlePress}
        style={({ pressed }) => [pressed && { opacity: 0.75 }]}
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
            <Text style={styles.committed} numberOfLines={1}>{committedLabel}</Text>
          </View>
          <View style={styles.right}>
            <Text style={styles.spent}>{formatMoney(spent)}</Text>
            <View style={[styles.badge, badgeStyle]}>
              <Text style={[styles.badgeText, badgeTextStyle]}>{badgeText}</Text>
            </View>
          </View>
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  info: { flex: 1, gap: 3 },
  name: { ...StyleSheet.flatten(textStyles.h3), color: colors.text.primary },
  committed: { fontSize: 12, color: colors.text.muted },
  right: { alignItems: 'flex-end', gap: 3 },
  spent: { ...StyleSheet.flatten(textStyles.h3), color: colors.text.primary },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgePaid: {
    backgroundColor: colors.success.bg,
  },
  badgePartial: {
    backgroundColor: colors.warning.bg,
  },
  badgePending: {
    backgroundColor: colors.bg.elevated,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
});

export default React.memo(FixedExpenseItem);
