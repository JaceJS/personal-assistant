import { StyleSheet, Text, View } from 'react-native';
import { TrendingDown, TrendingUp } from 'lucide-react-native';

import { useTransactions } from '@/features/finance/hooks/useTransactions';
import { formatRupiah } from '@/lib/utils';
import { colors, radius, spacing, textStyles } from '@/theme';

function getMonthRange(year: number, month: number) {
  const from = [
    year,
    String(month + 1).padStart(2, '0'),
    '01',
  ].join('-');
  const lastDayDate = new Date(year, month + 1, 0);
  const to = [
    lastDayDate.getFullYear(),
    String(lastDayDate.getMonth() + 1).padStart(2, '0'),
    String(lastDayDate.getDate()).padStart(2, '0'),
  ].join('-');
  return { from, to };
}

export default function ProjectedEndOfMonthCard() {
  const now = new Date();
  const curr = getMonthRange(now.getFullYear(), now.getMonth());
  const last = getMonthRange(now.getFullYear(), now.getMonth() - 1);

  const { data: currData } = useTransactions({ dateFrom: curr.from, dateTo: curr.to, limit: 200 });
  const { data: lastData } = useTransactions({ dateFrom: last.from, dateTo: last.to, limit: 200 });

  const currItems = currData?.items ?? [];
  const currIncome = currItems.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const currExpense = currItems.filter((t) => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
  const currNet = currIncome - currExpense;

  const lastNet = (lastData?.items ?? []).reduce((s, t) => s + t.amount, 0);
  const pctChange = lastNet !== 0
    ? Math.round(((currNet - lastNet) / Math.abs(lastNet)) * 100)
    : 0;

  const isPositive = currNet >= 0;
  const netColor = isPositive ? colors.success.text : colors.danger.text;
  const isHigher = pctChange >= 0;
  const TrendIcon = isHigher ? TrendingUp : TrendingDown;
  const trendColor = isHigher ? colors.success.text : colors.danger.text;

  return (
    <View style={styles.card}>
      <View style={styles.glow} />
      <Text style={styles.overline}>NET BULAN INI</Text>
      <Text style={[styles.amount, { color: netColor }]}>
        {isPositive ? '+' : ''}{formatRupiah(currNet)}
      </Text>

      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>Pemasukan</Text>
          <Text style={[styles.statAmount, { color: colors.success.text }]}>+{formatRupiah(currIncome)}</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={[styles.stat, styles.statRight]}>
          <Text style={styles.statLabel}>Pengeluaran</Text>
          <Text style={[styles.statAmount, { color: colors.danger.text }]}>-{formatRupiah(currExpense)}</Text>
        </View>
      </View>

      {lastNet !== 0 && (
        <View style={styles.trend}>
          <TrendIcon size={13} color={trendColor} strokeWidth={2} />
          <Text style={[styles.trendText, { color: trendColor }]}>
            {Math.abs(pctChange)}% {isHigher ? 'lebih dari' : 'di bawah'} bulan lalu
          </Text>
        </View>
      )}
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
    overflow: 'hidden',
  },
  glow: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: colors.accent.primary,
    top: -50,
    right: -40,
    opacity: 0.12,
  },
  overline: {
    ...StyleSheet.flatten(textStyles.overline),
    fontSize: 10,
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  amount: {
    ...StyleSheet.flatten(textStyles.display),
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 14,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  stat: {
    flex: 1,
    gap: 2,
  },
  statRight: {
    alignItems: 'flex-end',
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: colors.border.subtle,
    marginHorizontal: spacing.md,
  },
  statLabel: {
    ...StyleSheet.flatten(textStyles.caption),
    fontSize: 11,
    color: colors.text.muted,
  },
  statAmount: {
    ...StyleSheet.flatten(textStyles.caption),
    fontSize: 13,
    fontWeight: '600',
  },
  trend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  trendText: {
    ...StyleSheet.flatten(textStyles.caption),
    fontSize: 12,
    fontWeight: '500',
  },
});
