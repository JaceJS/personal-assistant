import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { useBudget } from '@/features/finance/hooks/useBudget';
import { useTransactions } from '@/features/finance/hooks/useTransactions';
import { formatRupiah } from '@/lib/utils';
import { colors, radius, spacing, textStyles } from '@/theme';

const RING_R = 36;
const RING_STROKE = 7;
const RING_SIZE = (RING_R + RING_STROKE) * 2;
const RING_CENTER = RING_SIZE / 2;
const CIRCUMFERENCE = 2 * Math.PI * RING_R;

export default function DailySpendCard() {
  const now = new Date();
  const today = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('-');

  const { data: budget, isLoading: budgetLoading } = useBudget();
  const { data } = useTransactions({ dateFrom: today, dateTo: today, limit: 100 });

  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const dailyLimit = budget?.monthly_limit != null
    ? Math.round(budget.monthly_limit / daysInMonth)
    : null;

  const todaySpend = (data?.items ?? [])
    .filter((t) => t.amount < 0)
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  if (!budgetLoading && dailyLimit === null) {
    return (
      <View style={[styles.card, styles.cardEmpty]}>
        <Text style={styles.emptyTitle}>Batas Pengeluaran Harian</Text>
        <Text style={styles.noLimit}>Belum ada anggaran</Text>
        <Text style={styles.noLimitSub}>Atur anggaran bulanan untuk memantau pengeluaran harian</Text>
      </View>
    );
  }

  const limit = dailyLimit ?? 0;
  const displayPct = limit > 0 ? todaySpend / limit : 0;
  const barPct = Math.min(displayPct, 1);
  const remaining = Math.max(limit - todaySpend, 0);
  const dashOffset = CIRCUMFERENCE * (1 - barPct);
  const ringColor =
    barPct >= 1 ? colors.danger.text :
    barPct >= 0.7 ? colors.warning.text :
    colors.accent.primary;

  return (
    <View style={styles.card}>
      <View style={styles.left}>
        <Text style={styles.overline}>PENGELUARAN HARI INI</Text>
        <Text style={[styles.spend, { color: ringColor }]}>{formatRupiah(todaySpend)}</Text>
        <Text style={styles.limitLabel}>dari {formatRupiah(limit)}</Text>
        <View style={[styles.remainingChip, { borderColor: ringColor + '44' }]}>
          <Text style={[styles.remainingText, { color: ringColor }]}>
            sisa {formatRupiah(remaining)}
          </Text>
        </View>
      </View>

      <View style={styles.ringWrap}>
        <Svg width={RING_SIZE} height={RING_SIZE}>
          <Circle
            cx={RING_CENTER} cy={RING_CENTER} r={RING_R}
            stroke={colors.bg.elevated}
            strokeWidth={RING_STROKE}
            fill="none"
          />
          <Circle
            cx={RING_CENTER} cy={RING_CENTER} r={RING_R}
            stroke={ringColor}
            strokeWidth={RING_STROKE}
            fill="none"
            strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            rotation="-90"
            origin={`${RING_CENTER}, ${RING_CENTER}`}
          />
        </Svg>
        <View style={styles.ringCenter}>
          <Text style={[styles.pct, { color: ringColor }]}>{Math.round(displayPct * 100)}%</Text>
          <Text style={styles.usedLabel}>terpakai</Text>
        </View>
      </View>
    </View>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardEmpty: {
    flexDirection: 'column',
    alignItems: 'center',
    paddingVertical: 32,
  },
  left: {
    flex: 1,
    gap: 4,
    paddingRight: spacing.md,
  },
  overline: {
    ...StyleSheet.flatten(textStyles.overline),
    fontSize: 10,
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  spend: {
    ...StyleSheet.flatten(textStyles.display),
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  limitLabel: {
    ...StyleSheet.flatten(textStyles.caption),
    color: colors.text.muted,
    marginTop: 2,
  },
  remainingChip: {
    alignSelf: 'flex-start',
    marginTop: 8,
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  remainingText: {
    ...StyleSheet.flatten(textStyles.caption),
    fontSize: 12,
    fontWeight: '600',
  },
  ringWrap: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringCenter: {
    position: 'absolute',
    alignItems: 'center',
  },
  pct: {
    ...StyleSheet.flatten(textStyles.caption),
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  usedLabel: {
    ...StyleSheet.flatten(textStyles.caption),
    fontSize: 9,
    color: colors.text.muted,
  },
  emptyTitle: {
    ...StyleSheet.flatten(textStyles.h3),
    color: colors.text.primary,
    marginBottom: 6,
  },
  noLimit: {
    ...StyleSheet.flatten(textStyles.h3),
    color: colors.text.secondary,
    marginTop: 12,
    marginBottom: 6,
  },
  noLimitSub: {
    ...StyleSheet.flatten(textStyles.caption),
    fontSize: 13,
    color: colors.text.muted,
    textAlign: 'center',
  },
});
