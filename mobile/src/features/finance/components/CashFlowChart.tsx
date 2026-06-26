import { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useAnimatedReaction, useAnimatedStyle, runOnJS } from "react-native-reanimated";
import { Bar, CartesianChart, useChartPressState } from "victory-native";

import { useTransactions } from "@/features/finance/hooks/useTransactions";
import type { Transaction } from "@/features/finance/types";
import { useChartFont } from "@/hooks/useChartFont";
import { formatRupiah } from "@/lib/utils";
import { colors, radius, spacing, textStyles } from "@/theme";
import { ChartTooltip, TOOLTIP_WIDTH } from "./ChartTooltip";
import { clampTooltipX } from "../utils/chartTooltipUtils";

const MONTH_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];
const CHART_HEIGHT = 200;
const TOOLTIP_OFFSET_Y = 80;

interface CashFlowPoint {
  x: number;
  label: string;
  income: number;
  expense: number;
  [key: string]: string | number;
}

function formatChartY(val: number): string {
  if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}jt`;
  if (val >= 1_000) return `${(val / 1_000).toFixed(0)}k`;
  return String(Math.round(val));
}

function buildCashFlowBuckets(items: Transaction[]): CashFlowPoint[] {
  const buckets: CashFlowPoint[] = Array.from({ length: 12 }, (_, i) => ({
    x: i + 1,
    label: MONTH_SHORT[i],
    income: 0,
    expense: 0,
  }));
  items.forEach((tx) => {
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
  const buckets = useMemo(() => buildCashFlowBuckets(data?.items ?? []), [data]);
  const hasData = buckets.some((b) => b.income > 0 || b.expense > 0);

  const { state, isActive } = useChartPressState({ x: 0, y: { income: 0, expense: 0 } });
  const [containerWidth, setContainerWidth] = useState(0);
  const [tooltipLabel, setTooltipLabel] = useState('');
  const [incomeValue, setIncomeValue] = useState(0);
  const [expenseValue, setExpenseValue] = useState(0);

  useAnimatedReaction(
    () => ({ x: state.x.value.value, income: state.y.income.value.value, expense: state.y.expense.value.value }),
    ({ x, income, expense }) => {
      const bucket = buckets.find(b => b.x === Math.round(x));
      runOnJS(setTooltipLabel)(bucket?.label ?? '');
      runOnJS(setIncomeValue)(income);
      runOnJS(setExpenseValue)(expense);
    },
  );

  const tooltipStyle = useAnimatedStyle(() => ({
    left: clampTooltipX(state.x.position.value, containerWidth, TOOLTIP_WIDTH),
    top: Math.max(
      0,
      Math.min(state.y.income.position.value, state.y.expense.position.value) - TOOLTIP_OFFSET_Y,
    ),
  }));

  return (
    <View style={styles.card}>
      <View
        onLayout={e => setContainerWidth(e.nativeEvent.layout.width)}
        style={styles.chartContainer}
      >
        {hasData ? (
          <CartesianChart
            data={buckets}
            xKey="x"
            yKeys={["income", "expense"]}
            chartPressState={state}
            domainPadding={{ left: 16, right: 16, top: 20 }}
            xAxis={{
              font: chartFont,
              formatXLabel: (v) => buckets.find((b) => b.x === Math.round(Number(v)))?.label ?? "",
              labelColor: colors.text.muted,
              lineColor: colors.border.subtle,
              tickCount: 6,
            }}
            yAxis={[
              {
                font: chartFont,
                formatYLabel: (v) => formatChartY(Number(v)),
                labelColor: colors.text.muted,
                lineColor: colors.border.subtle,
                tickCount: 4,
              },
            ]}
          >
            {({ points, chartBounds }) => (
              <>
                <Bar
                  points={points.income}
                  chartBounds={chartBounds}
                  color={colors.success.text}
                  barWidth={16}
                  barCount={2}
                />
                <Bar
                  points={points.expense}
                  chartBounds={chartBounds}
                  color={colors.danger.text}
                  barWidth={16}
                  barCount={2}
                  animate={{ type: "spring" }}
                />
              </>
            )}
          </CartesianChart>
        ) : (
          <View style={styles.emptyChart}>
            <Text style={styles.emptyText}>Belum ada data tahun ini</Text>
          </View>
        )}

        {isActive && hasData && (
          <ChartTooltip
            animatedStyle={tooltipStyle}
            label={tooltipLabel}
            lines={[
              { text: `↑ ${formatRupiah(incomeValue)}`, color: colors.success.text },
              { text: `↓ ${formatRupiah(expenseValue)}`, color: colors.danger.text },
            ]}
          />
        )}
      </View>

      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.success.text }]} />
          <Text style={styles.legendLabel}>Pemasukan</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.danger.text }]} />
          <Text style={styles.legendLabel}>Pengeluaran</Text>
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
    marginHorizontal: spacing.xl,
    marginBottom: 12,
    padding: spacing.xl,
  },
  chartContainer: {
    height: CHART_HEIGHT,
    position: "relative",
  },
  emptyChart: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyText: { ...StyleSheet.flatten(textStyles.caption), fontSize: 13 },
  legend: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 20,
    marginTop: 12,
  },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { ...StyleSheet.flatten(textStyles.caption) },
});
