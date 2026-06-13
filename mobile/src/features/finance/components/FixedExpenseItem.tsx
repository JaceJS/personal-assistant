import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Category } from '@/features/finance/types';
import { categoryIcon } from '@/features/finance/utils/categoryIcon';
import { formatRupiah } from '@/lib/utils';
import { colors, radius, textStyles } from '@/theme';
import CategoryBudgetSheet from './CategoryBudgetSheet';

interface FixedExpenseItemProps {
  category: Category;
  spent: number;
}

function FixedExpenseItem({ category, spent }: FixedExpenseItemProps) {
  const [sheetVisible, setSheetVisible] = useState(false);
  const Icon = categoryIcon(category.name);
  const isUserCategory = category.user_id !== null;
  const isPaid = spent > 0;

  const committedLabel = category.budget_limit
    ? `Committed: ${formatRupiah(category.budget_limit)}`
    : 'No amount set';

  const handlePress = useCallback(() => {
    if (isUserCategory) setSheetVisible(true);
  }, [isUserCategory]);

  return (
    <>
      <Pressable
        onPress={handlePress}
        style={({ pressed }) => [pressed && isUserCategory && { opacity: 0.75 }]}
      >
        <View style={styles.row}>
          <View style={styles.iconBox}>
            <Icon size={20} color={colors.accent.text} strokeWidth={1.5} />
          </View>
          <View style={styles.info}>
            <Text style={styles.name} numberOfLines={1}>{category.name}</Text>
            <Text style={styles.committed} numberOfLines={1}>{committedLabel}</Text>
          </View>
          <View style={styles.right}>
            <Text style={styles.spent}>{formatRupiah(spent)}</Text>
            <Text style={[styles.badge, isPaid ? styles.badgePaid : styles.badgePending]}>
              {isPaid ? 'Paid' : 'Pending'}
            </Text>
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
  committed: { fontSize: 12, color: colors.text.muted },
  right: { alignItems: 'flex-end', gap: 3 },
  spent: { ...StyleSheet.flatten(textStyles.h3), color: colors.text.primary },
  badge: { fontSize: 11, fontWeight: '500' },
  badgePaid: { color: colors.success.text },
  badgePending: { color: colors.text.muted },
});

export default React.memo(FixedExpenseItem);
