import { StyleSheet, Text, View } from 'react-native';
import { TrendingDown, TrendingUp } from 'lucide-react-native';

import { useTransactions } from '@/features/finance/hooks/useTransactions';
import type { Transaction } from '@/features/finance/types';
import { formatRupiah } from '@/lib/utils';
import { colors, radius, spacing, textStyles } from '@/theme';

function getMonthRange(year: number, month: number) {
  const from = new Date(year, month, 1).toISOString().slice(0, 10);
  const to = new Date(year, month + 1, 0).toISOString().slice(0, 10);
  return { from, to };
}

function calcNet(items: Transaction[]): number {
  return items.reduce((sum, t) => sum + t.amount, 0);
}

export default function ProjectedEndOfMonthCard() {
  const now = new Date();
  const curr = getMonthRange(now.getFullYear(), now.getMonth());
  const last = getMonthRange(now.getFullYear(), now.getMonth() - 1);

  const { data: currData } = useTransactions({ dateFrom: curr.from, dateTo: curr.to, limit: 200 });
  const { data: lastData } = useTransactions({ dateFrom: last.from, dateTo: last.to, limit: 200 });

  const currNet = calcNet(currData?.items ?? []);
  const lastNet = calcNet(lastData?.items ?? []);
  const pctChange = lastNet !== 0
    ? Math.round(((currNet - lastNet) / Math.abs(lastNet)) * 100)
    : 0;
  const isHigher = pctChange >= 0;
  const TrendIcon = isHigher ? TrendingUp : TrendingDown;
  const trendColor = isHigher ? colors.success.text : colors.danger.text;

  return (
    <View style={styles.card}>
      <View style={styles.glow} />
      <View style={styles.header}>
        <Text style={styles.label}>Estimasi Akhir Bulan</Text>
        <TrendIcon size={18} color={trendColor} strokeWidth={2} />
      </View>
      <Text style={styles.amount}>{formatRupiah(currNet)}</Text>
      <Text style={[styles.change, { color: trendColor }]}>
        {isHigher ? '↑' : '↓'} {Math.abs(pctChange)}%{' '}
        {isHigher ? 'lebih dari bulan lalu' : 'lebih rendah dari bulan lalu'}
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
    marginHorizontal: spacing["2xl"],
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  label: {
    ...StyleSheet.flatten(textStyles.caption),
    fontSize: 13,
    fontWeight: '500',
    color: colors.text.secondary,
  },
  amount: {
    ...StyleSheet.flatten(textStyles.display),
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 6,
  },
  change: {
    ...StyleSheet.flatten(textStyles.caption),
    fontWeight: '500',
  },
});
