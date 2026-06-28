import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Pencil } from 'lucide-react-native';

import type { Budget } from '@/features/finance/types';
import { formatRupiah } from '@/lib/utils';
import { colors, radius, textStyles } from '@/theme';

function getBudgetBarColor(pct: number): string {
  if (pct >= 1) return colors.danger.text;
  if (pct >= 0.8) return colors.warning.text;
  return colors.accent.primary;
}

interface BudgetHeroCardProps {
  budget: Budget | null;
  totalSpent: number;
  onEdit: () => void;
}

function BudgetHeroCard({ budget, totalSpent, onEdit }: BudgetHeroCardProps) {
  if (!budget) {
    return (
      <View style={styles.card}>
        <View style={styles.noBudgetRow}>
          <View style={styles.noBudgetText}>
            <Text style={styles.label}>TOTAL BUDGET BULANAN</Text>
            <Text style={styles.noBudgetHint}>Belum ada budget</Text>
          </View>
          <Pressable
            style={({ pressed }) => [styles.editBtn, pressed && { opacity: 0.7 }]}
            onPress={onEdit}
          >
            <Pencil size={16} color={colors.accent.primary} strokeWidth={1.5} />
          </Pressable>
        </View>
      </View>
    );
  }

  const displayPct = budget.monthly_limit > 0 ? totalSpent / budget.monthly_limit : 0;
  const barPct = Math.min(displayPct, 1);
  const barColor = getBudgetBarColor(barPct);

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.topLeft}>
          <Text style={styles.label}>TOTAL BUDGET BULANAN</Text>
          <Text style={styles.amount}>{formatRupiah(budget.monthly_limit)}</Text>
        </View>
        <Pressable
          style={({ pressed }) => [styles.editBtn, pressed && { opacity: 0.7 }]}
          onPress={onEdit}
        >
          <Pencil size={16} color={colors.text.secondary} strokeWidth={1.5} />
        </Pressable>
      </View>

      <View style={styles.barTrack}>
        <View
          style={[
            styles.barFill,
            {
              width: `${Math.round(barPct * 100)}%` as `${number}%`,
              backgroundColor: barColor,
            },
          ]}
        />
      </View>

      <Text style={[styles.pctText, { color: barColor }]}>
        {Math.round(displayPct * 100)}% terpakai
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bg.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
    padding: 20,
    gap: 14,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  topLeft: { flex: 1, gap: 6 },
  label: {
    ...StyleSheet.flatten(textStyles.overline),
    fontSize: 10,
    color: colors.text.muted,
  },
  amount: {
    ...StyleSheet.flatten(textStyles.display),
    fontSize: 28,
    color: colors.text.primary,
  },
  editBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.bg.elevated,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
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
  pctText: {
    ...StyleSheet.flatten(textStyles.caption),
    textAlign: 'right',
    fontWeight: '600',
  },
  noBudgetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  noBudgetText: { flex: 1, gap: 4 },
  noBudgetHint: {
    ...StyleSheet.flatten(textStyles.body),
    color: colors.text.secondary,
  },
});

export default React.memo(BudgetHeroCard);
