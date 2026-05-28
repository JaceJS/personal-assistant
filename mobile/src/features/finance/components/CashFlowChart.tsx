import { StyleSheet, Text, View } from 'react-native';
import { Bar, CartesianChart } from 'victory-native';

import { useTransactions } from '@/features/finance/hooks/useTransactions';
import type { Transaction } from '@/features/finance/types';
import { useChartFont } from '@/hooks/useChartFont';
import { colors, radius } from '@/theme';

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const CHART_HEIGHT = 180;

interface CashFlowPoint {
  x: number;
  label: string;
  income: number;
  expense: number;
  [key: string]: string | number;
}

function buildCashFlowBuckets(items: Transaction[]): CashFlowPoint[] {
  const buckets: CashFlowPoint[] = Array.from({ length: 12 }, (_, i) => ({
    x: i + 1,
    label: MONTH_SHORT[i],
    income: 0,
    expense: 0,
  }));
  items.forEach(tx => {
    const month = new Date(tx.occurred_at).getMonth();
    if (tx.amount > 0) buckets[month].income += tx.amount;
    else buckets[month].expense += Math.abs(tx.amount);
  });
  return buckets;
}

export default function CashFlowChart() {
  const now = new Date();
  const yearStart = `${now.getFullYear()}-01-01`;
  const today = now.toISOString().slice(0, 10);
  const chartFont = useChartFont();

  const { data } = useTransactions({ dateFrom: yearStart, dateTo: today, limit: 1000 });
  const buckets = buildCashFlowBuckets(data?.items ?? []);

  return (
    <View style={styles.card}>
      <View style={styles.chartWrap}>
        <CartesianChart
          data={buckets}
          xKey="x"
          yKeys={['income', 'expense']}
          domainPadding={{ left: 16, right: 16, top: 16 }}
          xAxis={{
            font: chartFont,
            formatXLabel: v => buckets.find(b => b.x === Math.round(Number(v)))?.label ?? '',
            labelColor: colors.text.muted,
            lineColor: 'transparent',
            tickCount: 6,
          }}
          yAxis={[{
            font: chartFont,
            labelColor: 'transparent',
            lineColor: 'transparent',
            tickCount: 0,
          }]}
        >
          {({ points, chartBounds }) => (
            <>
              <Bar
                points={points.income}
                chartBounds={chartBounds}
                color={colors.bg.elevated}
                barWidth={8}
                roundedCorners={{ topLeft: 4, topRight: 4 }}
              />
              <Bar
                points={points.expense}
                chartBounds={chartBounds}
                color={colors.accent.primary}
                barWidth={8}
                roundedCorners={{ topLeft: 4, topRight: 4 }}
                animate={{ type: 'spring' }}
              />
            </>
          )}
        </CartesianChart>
      </View>

      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.bg.elevated }]} />
          <Text style={styles.legendLabel}>Income</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.accent.primary }]} />
          <Text style={styles.legendLabel}>Expense</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bg.surface,
    borderRadius: radius.lg,
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 16,
  },
  chartWrap: { height: CHART_HEIGHT },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginTop: 12,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { fontSize: 12, color: colors.text.muted },
});
