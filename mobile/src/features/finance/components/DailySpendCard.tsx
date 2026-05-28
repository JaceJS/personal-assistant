import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { useTransactions } from '@/features/finance/hooks/useTransactions';
import { formatRupiah } from '@/lib/utils';
import { colors } from '@/theme';

const DAILY_LIMIT = 500_000;
const RADIUS = 68;
const STROKE_W = 10;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function DailySpendCard() {
  const today = new Date().toISOString().slice(0, 10);
  const { data } = useTransactions({ dateFrom: today, dateTo: today, limit: 100 });

  const todaySpend = (data?.items ?? [])
    .filter((t) => t.amount < 0)
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  const pct = Math.min(todaySpend / DAILY_LIMIT, 1);
  const remaining = Math.max(DAILY_LIMIT - todaySpend, 0);
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
          <Text style={styles.usedLabel}>used</Text>
        </View>
      </View>

      <Text style={styles.title}>Daily Spending Limit</Text>
      <Text style={[styles.remaining, { color: ringColor }]}>
        {formatRupiah(remaining)} remaining for today
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bg.surface,
    borderRadius: 16,
    marginHorizontal: 20,
    marginBottom: 16,
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
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -1,
  },
  usedLabel: {
    fontSize: 12,
    color: colors.text.muted,
    marginTop: 2,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 6,
  },
  remaining: {
    fontSize: 13,
    fontWeight: '500',
  },
});
