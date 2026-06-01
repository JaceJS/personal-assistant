import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Bar, CartesianChart } from 'victory-native';

import { SkeletonCard } from '@/components/ui/Skeleton';
import type { Transaction } from '@/features/finance/types';
import { useChartFont } from '@/hooks/useChartFont';
import { formatRupiah } from '@/lib/utils';
import { colors, radius, textStyles } from '@/theme';

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const CHART_HEIGHT = 200;

interface MonthlyPoint {
  x: number;
  label: string;
  expense: number;
  [key: string]: string | number;
}

function buildMonthlyExpenseBuckets(items: Transaction[]): MonthlyPoint[] {
  const buckets: MonthlyPoint[] = Array.from({ length: 12 }, (_, i) => ({
    x: i + 1,
    label: MONTH_SHORT[i],
    expense: 0,
  }));
  items.forEach(tx => {
    if (tx.amount < 0) {
      const month = new Date(tx.occurred_at).getMonth();
      buckets[month].expense += Math.abs(tx.amount);
    }
  });
  return buckets;
}

function formatChartY(val: number): string {
  if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}jt`;
  if (val >= 1_000) return `${(val / 1_000).toFixed(0)}k`;
  return String(Math.round(val));
}

interface YearlyPerformanceSectionProps {
  transactions: Transaction[];
  year: number;
  onYearChange: (y: number) => void;
  isLoading?: boolean;
}

function YearlyPerformanceSection({
  transactions,
  year,
  onYearChange,
  isLoading,
}: YearlyPerformanceSectionProps) {
  const chartFont = useChartFont();
  const currentYear = new Date().getFullYear();
  const years = [currentYear - 2, currentYear - 1, currentYear];

  const buckets = useMemo(() => buildMonthlyExpenseBuckets(transactions), [transactions]);
  const hasData = buckets.some(b => b.expense > 0);

  const monthlyAvg = useMemo(() => {
    const total = buckets.reduce((sum, b) => sum + b.expense, 0);
    const activeCount = buckets.filter(b => b.expense > 0).length;
    return activeCount > 0 ? Math.round(total / activeCount) : 0;
  }, [buckets]);

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Text style={styles.title}>Yearly Performance</Text>
        <View style={styles.yearPills}>
          {years.map(y => (
            <Pressable
              key={y}
              style={[styles.pill, y === year && styles.pillActive]}
              onPress={() => onYearChange(y)}
            >
              <Text style={[styles.pillText, y === year && styles.pillTextActive]}>{y}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.card}>
        {isLoading ? (
          <SkeletonCard height={CHART_HEIGHT} />
        ) : (
          <View style={styles.chartWrap}>
            {hasData ? (
              <CartesianChart
                data={buckets}
                xKey="x"
                yKeys={['expense']}
                domainPadding={{ left: 16, right: 16, top: 20 }}
                xAxis={{
                  font: chartFont,
                  formatXLabel: v =>
                    buckets.find(b => b.x === Math.round(Number(v)))?.label ?? '',
                  labelColor: colors.text.muted,
                  lineColor: colors.border.subtle,
                  tickCount: 6,
                }}
                yAxis={[{
                  font: chartFont,
                  formatYLabel: v => formatChartY(Number(v)),
                  labelColor: colors.text.muted,
                  lineColor: colors.border.subtle,
                  tickCount: 4,
                }]}
              >
                {({ points, chartBounds }) => (
                  <Bar
                    points={points.expense}
                    chartBounds={chartBounds}
                    color={colors.accent.primary}
                    barWidth={20}
                    animate={{ type: 'spring' }}
                  />
                )}
              </CartesianChart>
            ) : (
              <View style={styles.emptyWrap}>
                <Text style={styles.emptyText}>No data for {year}</Text>
              </View>
            )}
          </View>
        )}

        {monthlyAvg > 0 && (
          <View style={styles.legend}>
            <View style={[styles.legendDot, { backgroundColor: colors.accent.primary }]} />
            <Text style={styles.legendText}>
              Monthly Average: {formatRupiah(monthlyAvg)}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: 24 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: { ...StyleSheet.flatten(textStyles.h2), color: colors.text.primary },
  yearPills: { flexDirection: 'row', gap: 6 },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
    backgroundColor: colors.bg.elevated,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  pillActive: {
    backgroundColor: colors.accent.subtle,
    borderColor: colors.accent.border,
  },
  pillText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.text.muted,
  },
  pillTextActive: { color: colors.accent.text },
  card: {
    backgroundColor: colors.bg.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
    padding: 16,
  },
  chartWrap: { height: CHART_HEIGHT },
  emptyWrap: {
    height: CHART_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    ...StyleSheet.flatten(textStyles.caption),
    color: colors.text.muted,
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { ...StyleSheet.flatten(textStyles.caption), color: colors.text.muted },
});

export default React.memo(YearlyPerformanceSection);
