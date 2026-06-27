import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { useBudget } from '@/features/finance/hooks/useBudget';
import { useTransactions } from '@/features/finance/hooks/useTransactions';
import { formatRupiah } from '@/lib/utils';
import { colors, textStyles } from '@/theme';
const RADIUS = 68;
const STROKE_W = 10;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function DailySpendCard() {
  const today = new Date().toISOString().slice(0, 10);
  const { data: budget, isLoading: budgetLoading } = useBudget();
  const { data } = useTransactions({ dateFrom: today, dateTo: today, limit: 100 });

  const now = new Date();
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
        <Text style={styles.title}>Batas Pengeluaran Harian</Text>
        <Text style={styles.noLimit}>Belum ada anggaran</Text>
        <Text style={styles.noLimitSub}>Atur anggaran bulanan untuk memantau pengeluaran harian</Text>
      </View>
    );
  }

  const limit = dailyLimit ?? 0;
  const pct = limit > 0 ? Math.min(todaySpend / limit, 1) : 0;
  const remaining = Math.max(limit - todaySpend, 0);
  const dashOffset = CIRCUMFERENCE * (1 - pct);
  const ringColor =
    pct >= 1 ? colors.danger.text :
    pct >= 0.7 ? colors.warning.text :
    colors.accent.primary;

  return (
    <View style={styles.card}>
      <View style={styles.ringWrap}>
        <Svg width={176} height={176} viewBox="0 0 176 176">
          <Circle
            cx={88} cy={88} r={RADIUS}
            stroke={colors.bg.elevated}
            strokeWidth={STROKE_W}
            fill="none"
          />
          <Circle
            cx={88} cy={88} r={RADIUS}
            stroke={ringColor}
            strokeWidth={STROKE_W}
            fill="none"
            strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            rotation="-90"
            origin="88, 88"
          />
        </Svg>
        <View style={styles.ringCenter}>
          <Text style={[styles.pct, { color: ringColor }]}>{Math.round(pct * 100)}%</Text>
          <Text style={styles.usedLabel}>terpakai</Text>
        </View>
      </View>

      <Text style={styles.title}>Batas Pengeluaran Harian</Text>
      <Text style={[styles.remaining, { color: ringColor }]}>
        tersisa {formatRupiah(remaining)} hari ini
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bg.surface,
    borderRadius: 16,
    marginHorizontal: spacing["2xl"],
    marginBottom: spacing.lg,
    paddingVertical: 24,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  ringWrap: {
    width: 176,
    height: 176,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  ringCenter: {
    position: 'absolute',
    alignItems: 'center',
  },
  pct: {
    ...StyleSheet.flatten(textStyles.display),
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -1,
  },
  usedLabel: {
    ...StyleSheet.flatten(textStyles.caption),
    color: colors.text.muted,
    marginTop: 2,
  },
  title: {
    ...StyleSheet.flatten(textStyles.h2),
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0,
    color: colors.text.primary,
    marginBottom: 6,
  },
  remaining: {
    ...StyleSheet.flatten(textStyles.mono),
    fontWeight: '500',
  },
  cardEmpty: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  noLimit: {
    ...StyleSheet.flatten(textStyles.h2),
    fontWeight: '700',
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
