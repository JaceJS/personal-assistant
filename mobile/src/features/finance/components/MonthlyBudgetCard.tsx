import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { useBudget } from '@/features/finance/hooks/useBudget';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { formatRupiah } from '@/lib/utils';
import { colors, radius, spacing, textStyles } from '@/theme';

function getBudgetColor(pct: number): string {
  if (pct >= 1) return colors.danger.text;
  if (pct >= 0.8) return colors.warning.text;
  return colors.accent.primary;
}

interface MonthlyBudgetCardProps {
  totalExpense: number;
  from?: 'home' | 'finance';
}

export default function MonthlyBudgetCard({ totalExpense, from }: MonthlyBudgetCardProps) {
  const router = useRouter();
  const { data: budget, isLoading } = useBudget();

  const budgetPath = from ? `/(app)/finance/budget?from=${from}` : `/(app)/finance/budget`;

  if (isLoading) {
    return <View style={styles.card}><SkeletonCard height={80} /></View>;
  }

  if (!budget) {
    return (
      <View style={styles.card}>
        <Pressable
          onPress={() => router.push(budgetPath)}
          style={({ pressed }) => pressed && { opacity: 0.7 }}
        >
          <View style={styles.promptRow}>
            <Text style={styles.promptText}>Atur budget bulanan</Text>
            <Text style={styles.promptArrow}>→</Text>
          </View>
        </Pressable>
      </View>
    );
  }

  const monthlyLimit = budget.monthly_limit;
  const pct = Math.min(totalExpense / monthlyLimit, 1);
  const remaining = Math.max(monthlyLimit - totalExpense, 0);
  const barColor = getBudgetColor(pct);

  const now = new Date();
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysLeft = lastDay - now.getDate();

  return (
    <Pressable
      onPress={() => router.push(budgetPath)}
      style={({ pressed }) => pressed && { opacity: 0.85 }}
    >
      <View style={styles.card}>
        <View style={styles.topRow}>
          <View style={styles.topLeft}>
            <Text style={styles.budgetLabel}>TOTAL BUDGET BULANAN</Text>
            <Text style={styles.budgetAmount}>{formatRupiah(monthlyLimit)}</Text>
          </View>
          <View style={[styles.pctBadge, { borderColor: barColor + '44' }]}>
            <Text style={[styles.pctText, { color: barColor }]}>{Math.round(pct * 100)}%</Text>
          </View>
        </View>

        <View style={styles.barTrack}>
          <View style={[styles.barFill, { width: `${Math.round(pct * 100)}%` as `${number}%`, backgroundColor: barColor }]} />
        </View>

        <View style={styles.spentRow}>
          <View>
            <Text style={styles.rowLabel}>Terpakai</Text>
            <Text style={styles.rowAmount}>{formatRupiah(totalExpense)}</Text>
          </View>
          <View style={styles.remainingCol}>
            <Text style={styles.rowLabel}>Tersisa</Text>
            <Text style={[styles.rowAmount, { color: colors.accent.text }]}>{formatRupiah(remaining)}</Text>
            {daysLeft > 0 && (
              <Text style={styles.daysLeft}>{daysLeft} hari lagi</Text>
            )}
          </View>
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
    marginHorizontal: spacing['2xl'],
    marginBottom: spacing.lg,
    padding: spacing.xl,
  },

  promptRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 },
  promptText: { ...StyleSheet.flatten(textStyles.body), color: colors.text.secondary },
  promptArrow: { ...StyleSheet.flatten(textStyles.body), color: colors.accent.primary },

  topRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 },
  topLeft: { flex: 1, gap: 4 },
  budgetLabel: { ...StyleSheet.flatten(textStyles.overline), fontSize: 10 },
  budgetAmount: { ...StyleSheet.flatten(textStyles.display), fontSize: 22, fontWeight: '800' },

  pctBadge: {
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  pctText: {
    ...StyleSheet.flatten(textStyles.caption),
    fontSize: 13,
    fontWeight: '700',
  },

  barTrack: { height: 10, borderRadius: radius.full, backgroundColor: colors.bg.elevated, marginBottom: 14, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: radius.full },

  spentRow: { flexDirection: 'row', justifyContent: 'space-between' },
  remainingCol: { alignItems: 'flex-end' },
  rowLabel: { ...StyleSheet.flatten(textStyles.caption), fontSize: 11, marginBottom: 2 },
  rowAmount: { ...StyleSheet.flatten(textStyles.caption), fontSize: 13, fontWeight: '600', color: colors.text.primary },
  daysLeft: { ...StyleSheet.flatten(textStyles.caption), fontSize: 10, color: colors.text.muted, marginTop: 2 },
});
