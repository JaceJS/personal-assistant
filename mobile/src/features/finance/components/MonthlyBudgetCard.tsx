import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useRouter } from 'expo-router';

import { useBudget } from '@/features/finance/hooks/useBudget';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { formatRupiah } from '@/lib/utils';
import { colors, radius, textStyles } from '@/theme';

const RING_RADIUS = 36;
const RING_STROKE_W = 6;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
const RING_SIZE = (RING_RADIUS + RING_STROKE_W) * 2;
const RING_CENTER = RING_SIZE / 2;

interface MonthlyBudgetCardProps {
  totalExpense: number;
}

function getBudgetRingColor(pct: number): string {
  if (pct >= 1) return colors.danger.text;
  if (pct >= 0.8) return colors.warning.text;
  return colors.accent.primary;
}

export default function MonthlyBudgetCard({ totalExpense }: MonthlyBudgetCardProps) {
  const router = useRouter();
  const { data: budget, isLoading } = useBudget();

  if (isLoading) {
    return <View style={styles.card}><SkeletonCard height={80} /></View>;
  }

  if (!budget) {
    return (
      <View style={styles.card}>
        <Pressable style={styles.promptRow} onPress={() => router.push('/(app)/finance/budget')}>
          <Text style={styles.promptText}>Set a monthly budget</Text>
          <Text style={styles.promptArrow}>→</Text>
        </Pressable>
      </View>
    );
  }

  const monthlyLimit = budget.monthly_limit;
  const pct = Math.min(totalExpense / monthlyLimit, 1);
  const remaining = Math.max(monthlyLimit - totalExpense, 0);
  const dashOffset = RING_CIRCUMFERENCE * (1 - pct);
  const ringCol = getBudgetRingColor(pct);

  return (
    <Pressable
      onPress={() => router.push('/(app)/finance/budget')}
      style={({ pressed }) => pressed && { opacity: 0.85 }}
    >
      <View style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.topLeft}>
          <Text style={styles.budgetLabel}>TOTAL MONTHLY BUDGET</Text>
          <Text style={styles.budgetAmount}>{formatRupiah(monthlyLimit)}</Text>
        </View>
        <View style={styles.ringWrap}>
          <Svg width={RING_SIZE} height={RING_SIZE}>
            <Circle
              cx={RING_CENTER} cy={RING_CENTER} r={RING_RADIUS}
              stroke={colors.bg.elevated}
              strokeWidth={RING_STROKE_W}
              fill="none"
            />
            <Circle
              cx={RING_CENTER} cy={RING_CENTER} r={RING_RADIUS}
              stroke={ringCol}
              strokeWidth={RING_STROKE_W}
              fill="none"
              strokeDasharray={`${RING_CIRCUMFERENCE} ${RING_CIRCUMFERENCE}`}
              strokeDashoffset={dashOffset}
              strokeLinecap="round"
              rotation="-90"
              origin={`${RING_CENTER}, ${RING_CENTER}`}
            />
          </Svg>
          <View style={styles.ringCenter}>
            <Text style={[styles.ringPct, { color: ringCol }]}>{Math.round(pct * 100)}%</Text>
          </View>
        </View>
      </View>

      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${Math.round(pct * 100)}%` as `${number}%`, backgroundColor: ringCol }]} />
      </View>

      <View style={styles.spentRow}>
        <View>
          <Text style={styles.rowLabel}>Spent</Text>
          <Text style={styles.rowAmount}>{formatRupiah(totalExpense)}</Text>
        </View>
        <View style={styles.remainingCol}>
          <Text style={styles.rowLabel}>Remaining</Text>
          <Text style={[styles.rowAmount, { color: colors.accent.text }]}>{formatRupiah(remaining)}</Text>
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
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 16,
  },

  promptRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 },
  promptText: { fontSize: 14, color: colors.text.secondary },
  promptArrow: { fontSize: 16, color: colors.accent.primary },

  topRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 },
  topLeft: { flex: 1, gap: 4 },
  budgetLabel: { ...StyleSheet.flatten(textStyles.overline), fontSize: 10 },
  budgetAmount: { ...StyleSheet.flatten(textStyles.display), fontSize: 22, fontWeight: '800' },
  ringWrap: { width: RING_SIZE, height: RING_SIZE, alignItems: 'center', justifyContent: 'center' },
  ringCenter: { position: 'absolute', alignItems: 'center' },
  ringPct: { fontSize: 13, fontWeight: '700' },

  barTrack: { height: 6, borderRadius: radius.full, backgroundColor: colors.bg.elevated, marginBottom: 12, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: radius.full },

  spentRow: { flexDirection: 'row', justifyContent: 'space-between' },
  remainingCol: { alignItems: 'flex-end' },
  rowLabel: { ...StyleSheet.flatten(textStyles.caption), fontSize: 11, marginBottom: 2 },
  rowAmount: { ...StyleSheet.flatten(textStyles.caption), fontSize: 13, fontWeight: '600', color: colors.text.primary },
});
