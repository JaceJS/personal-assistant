import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { SavingsGoal } from '@/features/finance/types';
import { daysRemaining } from '@/features/finance/utils/savingsGoalUtils';
import { formatRupiah } from '@/lib/utils';
import { colors, radius, textStyles } from '@/theme';

interface SavingsGoalCardProps {
  goal: SavingsGoal;
  onPress: () => void;
}

function getBarColor(pct: number): string {
  if (pct >= 100) return colors.success.text;
  if (pct >= 80) return colors.accent.primary;
  return colors.accent.primary;
}

function SavingsGoalCard({ goal, onPress }: SavingsGoalCardProps) {
  const days = daysRemaining(goal.target_date);
  const barColor = getBarColor(goal.progress_pct);

  let daysLabel: string | null = null;
  if (days !== null) {
    if (days < 0) daysLabel = 'Sudah lewat target';
    else if (days === 0) daysLabel = 'Hari ini!';
    else daysLabel = `${days} hari lagi`;
  }

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => pressed && { opacity: 0.85 }}
    >
      <View style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.iconWrap}>
          <Text style={styles.icon}>{goal.icon ?? '🎯'}</Text>
        </View>
        <View style={styles.titleBlock}>
          <Text style={styles.name} numberOfLines={1}>{goal.name}</Text>
          {daysLabel && (
            <Text style={[styles.daysLabel, days !== null && days < 0 && { color: colors.warning.text }]}>
              {daysLabel}
            </Text>
          )}
        </View>
        {goal.is_completed && (
          <View style={styles.completedBadge}>
            <Text style={styles.completedText}>✓ Tercapai</Text>
          </View>
        )}
      </View>

      <View style={styles.barTrack}>
        <View
          style={[
            styles.barFill,
            {
              width: `${Math.min(goal.progress_pct, 100)}%` as `${number}%`,
              backgroundColor: barColor,
            },
          ]}
        />
      </View>

      <View style={styles.amountRow}>
        <Text style={styles.currentAmount}>{formatRupiah(goal.current_amount)}</Text>
        <Text style={styles.pct}>{Math.round(goal.progress_pct)}%</Text>
        <Text style={styles.targetAmount}>{formatRupiah(goal.target_amount)}</Text>
      </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bg.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
    padding: 16,
    gap: 12,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.bg.elevated,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  icon: { fontSize: 22 },
  titleBlock: { flex: 1, gap: 2 },
  name: {
    ...StyleSheet.flatten(textStyles.h3),
    color: colors.text.primary,
  },
  daysLabel: {
    ...StyleSheet.flatten(textStyles.caption),
    color: colors.text.muted,
  },
  completedBadge: {
    backgroundColor: colors.success.bg,
    borderRadius: radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  completedText: {
    ...StyleSheet.flatten(textStyles.caption),
    color: colors.success.text,
    fontWeight: '600',
  },
  barTrack: {
    height: 6,
    borderRadius: radius.full,
    backgroundColor: colors.bg.elevated,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: radius.full,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  currentAmount: {
    ...StyleSheet.flatten(textStyles.caption),
    color: colors.text.primary,
    fontWeight: '600',
  },
  pct: {
    ...StyleSheet.flatten(textStyles.caption),
    color: colors.text.muted,
  },
  targetAmount: {
    ...StyleSheet.flatten(textStyles.caption),
    color: colors.text.muted,
  },
});

export default React.memo(SavingsGoalCard);
