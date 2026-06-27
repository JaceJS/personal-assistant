import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedReaction, useAnimatedStyle, runOnJS } from 'react-native-reanimated';
import { Area, CartesianChart, Line, useChartPressState } from 'victory-native';
import { ChevronDown } from 'lucide-react-native';

import { useTransactions } from '@/features/finance/hooks/useTransactions';
import { buildDailyBuckets, buildMonthlyBuckets, buildWeeklyBuckets } from '@/features/finance/utils/chart';
import { formatRupiah } from '@/lib/utils';
import { useChartFont } from '@/hooks/useChartFont';
import { colors, radius } from '@/theme';

type Period = 'D' | 'W' | 'M';

const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: 'D', label: 'Daily' },
  { value: 'W', label: 'Weekly' },
  { value: 'M', label: 'Monthly' },
];

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function formatChartY(val: number): string {
  if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}jt`;
  if (val >= 1_000) return `${(val / 1_000).toFixed(0)}k`;
  return String(Math.round(val));
}

export default function SpendChartCard() {
  const [period, setPeriod] = useState<Period>('M');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [activePoint, setActivePoint] = useState<{ week: number; amount: number } | null>(null);
  const { state: pressState } = useChartPressState({ x: 1, y: { y: 0 } });

  useAnimatedReaction(
    () => ({ active: pressState.isActive.value, x: pressState.x.value.value, y: pressState.y.y.value.value }),
    ({ active, x, y }) => {
      if (active) runOnJS(setActivePoint)({ week: Math.round(x), amount: y });
      else runOnJS(setActivePoint)(null);
    },
  );

  const tooltipStyle = useAnimatedStyle(() => ({
    position: 'absolute',
    left: pressState.x.position.value - 52,
    top: pressState.y.y.position.value - 56,
    opacity: pressState.isActive.value ? 1 : 0,
  }));

  const now = new Date();

  const chartDateFrom = period === 'M'
    ? `${now.getFullYear()}-01-01`
    : new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const chartDateTo = period === 'M'
    ? `${now.getFullYear()}-12-31`
    : new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);

  const { data: chartTxData } = useTransactions({ dateFrom: chartDateFrom, dateTo: chartDateTo, limit: 200 });
  const chartFont = useChartFont();

  const chartItems = chartTxData?.items ?? [];
  const chartData =
    period === 'D' ? buildDailyBuckets(chartItems, now)
    : period === 'W' ? buildWeeklyBuckets(chartItems, now)
    : buildMonthlyBuckets(chartItems, now.getFullYear());

  const periodSpend = chartItems
    .filter((tx) => tx.amount < 0)
    .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

  const hasChartData = chartData.some((d) => d.y > 0);
  const maxY = Math.max(...chartData.map((d) => d.y), 1);

  return (
    <View style={styles.card}>
      <View style={styles.spendHeader}>
        <Text style={styles.sectionLabel}>
          {period === 'D' ? 'DAILY SPEND' : period === 'W' ? 'WEEKLY SPEND' : 'MONTHLY SPEND'}
        </Text>
        <View style={styles.dropdownWrap}>
          <Pressable
            style={styles.dropdownTrigger}
            onPress={() => setDropdownOpen((o) => !o)}
          >
            <Text style={styles.dropdownTriggerText}>
              {PERIOD_OPTIONS.find((o) => o.value === period)?.label}
            </Text>
            <ChevronDown size={12} color={colors.text.muted} strokeWidth={2} />
          </Pressable>
          {dropdownOpen && (
            <View style={styles.dropdownMenu}>
              {PERIOD_OPTIONS.map((opt) => (
                <Pressable
                  key={opt.value}
                  style={[styles.dropdownItem, period === opt.value && styles.dropdownItemActive]}
                  onPress={() => { setPeriod(opt.value); setDropdownOpen(false); }}
                >
                  <Text style={[styles.dropdownItemText, period === opt.value && styles.dropdownItemTextActive]}>
                    {opt.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      </View>

      {period !== 'M' && (
        <Text style={styles.monthLabel}>{MONTH_NAMES[now.getMonth()]} {now.getFullYear()}</Text>
      )}

      <Text style={styles.spendAmount}>{formatRupiah(periodSpend)}</Text>

      <View style={styles.chartWrap}>
        {hasChartData ? (
          <CartesianChart
            data={chartData}
            xKey="x"
            yKeys={['y']}
            chartPressState={pressState}
            domain={{ y: [0, maxY] }}
            domainPadding={{ left: 8, right: 16, top: 20 }}
            xAxis={{
              font: chartFont,
              formatXLabel: (v) => chartData.find((d) => d.x === Math.round(Number(v)))?.label ?? `${v}`,
              labelColor: colors.text.muted,
              lineColor: colors.border.subtle,
              tickCount: period === 'D' ? 6 : period === 'W' ? 4 : 6,
            }}
            yAxis={[{
              font: chartFont,
              formatYLabel: (v) => formatChartY(Number(v)),
              labelColor: colors.text.muted,
              lineColor: colors.border.subtle,
              tickCount: 4,
            }]}
          >
            {({ points, chartBounds }) => (
              <>
                <Area
                  points={points.y}
                  y0={chartBounds.bottom}
                  color={colors.accent.primary}
                  opacity={0.12}
                  curveType="linear"
                />
                <Line
                  points={points.y}
                  color={colors.accent.primary}
                  strokeWidth={2.5}
                  curveType="linear"
                />
              </>
            )}
          </CartesianChart>
        ) : (
          <View style={styles.chartPlaceholder} />
        )}
        <Animated.View style={[styles.tooltip, tooltipStyle]}>
          <Text style={styles.tooltipWeek}>
            {activePoint ? (chartData.find((d) => d.x === activePoint.week)?.label ?? '') : ''}
          </Text>
          <Text style={styles.tooltipAmount}>
            {activePoint ? formatRupiah(activePoint.amount) : ''}
          </Text>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bg.surface,
    borderRadius: radius.lg,
    marginHorizontal: spacing["2xl"],
    marginBottom: spacing.lg,
    padding: 16,
  },
  spendHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.text.muted,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  dropdownWrap: { position: 'relative' },
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.sm,
    backgroundColor: colors.bg.elevated,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  dropdownTriggerText: { fontSize: 12, fontWeight: '500', color: colors.text.secondary },
  dropdownMenu: {
    position: 'absolute',
    top: 30,
    right: 0,
    backgroundColor: colors.bg.elevated,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    minWidth: 110,
    zIndex: 20,
    overflow: 'hidden',
  },
  dropdownItem: { paddingHorizontal: 14, paddingVertical: 10 },
  dropdownItemActive: { backgroundColor: colors.bg.hover },
  dropdownItemText: { fontSize: 13, color: colors.text.secondary },
  dropdownItemTextActive: { color: colors.text.primary, fontWeight: '600' },
  monthLabel: {
    fontSize: 12,
    color: colors.text.muted,
    marginTop: 2,
    marginBottom: 4,
  },
  spendAmount: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text.primary,
    letterSpacing: -0.5,
    marginBottom: 16,
  },
  chartWrap: { height: 200 },
  chartPlaceholder: { height: 200 },
  tooltip: {
    position: 'absolute',
    backgroundColor: colors.bg.elevated,
    borderRadius: radius.md,
    padding: 8,
    gap: 2,
    minWidth: 104,
  },
  tooltipWeek: { fontSize: 11, fontWeight: '600', color: colors.text.muted, letterSpacing: 0.5 },
  tooltipAmount: { fontSize: 13, fontWeight: '600', color: colors.danger.text },
});
