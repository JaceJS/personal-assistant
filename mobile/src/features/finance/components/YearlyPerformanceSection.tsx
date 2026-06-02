import React, { useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Bar, CartesianChart } from 'victory-native';
import { Check, ChevronDown } from 'lucide-react-native';

import { SkeletonCard } from '@/components/ui/Skeleton';
import type { Transaction } from '@/features/finance/types';
import { useChartFont } from '@/hooks/useChartFont';
import { formatRupiah } from '@/lib/utils';
import { colors, radius, spacing, textStyles } from '@/theme';

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

// ── Sub-components ────────────────────────────────────────────────────────────

interface YearDropdownProps {
  value: number;
  options: number[];
  onChange: (year: number) => void;
}

function YearDropdown({ value, options, onChange }: YearDropdownProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        style={({ pressed }) => pressed && { opacity: 0.7 }}
      >
        <View style={dropdownStyles.trigger}>
          <Text style={dropdownStyles.triggerText}>{value}</Text>
          <ChevronDown size={14} color={colors.text.muted} />
        </View>
      </Pressable>

      <Modal visible={open} transparent animationType="fade">
        <Pressable style={dropdownStyles.backdrop} onPress={() => setOpen(false)}>
          <View style={dropdownStyles.menu}>
            {options.map(opt => (
              <Pressable
                key={opt}
                onPress={() => { onChange(opt); setOpen(false); }}
                style={({ pressed }) => pressed && { opacity: 0.7 }}
              >
                <View style={[dropdownStyles.option, opt === value && dropdownStyles.optionActive]}>
                  <Text style={[dropdownStyles.optionText, opt === value && dropdownStyles.optionTextActive]}>
                    {opt}
                  </Text>
                  {opt === value && <Check size={14} color={colors.accent.primary} />}
                </View>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

interface ChartContentProps {
  buckets: MonthlyPoint[];
  year: number;
  chartFont: ReturnType<typeof useChartFont>;
}

function ChartContent({ buckets, year, chartFont }: ChartContentProps) {
  const hasData = buckets.some(b => b.expense > 0);

  if (!hasData) {
    return (
      <View style={styles.emptyWrap}>
        <Text style={styles.emptyText}>No data for {year}</Text>
      </View>
    );
  }

  return (
    <CartesianChart
      data={buckets}
      xKey="x"
      yKeys={['expense']}
      domainPadding={{ left: 16, right: 16, top: 20 }}
      xAxis={{
        font: chartFont,
        formatXLabel: v => buckets.find(b => b.x === Math.round(Number(v)))?.label ?? '',
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
  );
}

interface ChartLegendProps {
  monthlyAvg: number;
}

function ChartLegend({ monthlyAvg }: ChartLegendProps) {
  if (monthlyAvg === 0) return null;

  return (
    <View style={styles.legend}>
      <View style={[styles.legendDot, { backgroundColor: colors.accent.primary }]} />
      <Text style={styles.legendText}>Monthly Average: {formatRupiah(monthlyAvg)}</Text>
    </View>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

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

  const monthlyAvg = useMemo(() => {
    const total = buckets.reduce((sum, b) => sum + b.expense, 0);
    const activeCount = buckets.filter(b => b.expense > 0).length;
    return activeCount > 0 ? Math.round(total / activeCount) : 0;
  }, [buckets]);

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Text style={styles.title}>Spending Overview</Text>
        <YearDropdown value={year} options={years} onChange={onYearChange} />
      </View>

      <View style={styles.card}>
        {isLoading ? (
          <SkeletonCard height={CHART_HEIGHT} />
        ) : (
          <View style={styles.chartWrap}>
            <ChartContent buckets={buckets} year={year} chartFont={chartFont} />
          </View>
        )}
        <ChartLegend monthlyAvg={monthlyAvg} />
      </View>
    </View>
  );
}

export default React.memo(YearlyPerformanceSection);

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  section: { marginTop: 24 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: { ...StyleSheet.flatten(textStyles.h2), color: colors.text.primary },
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

const dropdownStyles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.bg.elevated,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.default,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  triggerText: {
    ...StyleSheet.flatten(textStyles.caption),
    color: colors.text.primary,
    fontWeight: '500',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  menu: {
    backgroundColor: colors.bg.elevated,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing['3xl'],
    paddingHorizontal: spacing['2xl'],
    gap: spacing.xs,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
  },
  optionActive: {
    backgroundColor: colors.accent.subtle,
  },
  optionText: {
    ...StyleSheet.flatten(textStyles.body),
    color: colors.text.secondary,
  },
  optionTextActive: {
    color: colors.accent.text,
    fontWeight: '600',
  },
});
