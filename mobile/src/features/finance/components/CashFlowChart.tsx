import { StyleSheet, Text, View } from "react-native";
import { Bar, CartesianChart } from "victory-native";

import { useTransactions } from "@/features/finance/hooks/useTransactions";
import type { Transaction } from "@/features/finance/types";
import { useChartFont } from "@/hooks/useChartFont";
import { colors, radius, textStyles } from "@/theme";

const MONTH_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
const CHART_HEIGHT = 200;

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
  const buckets = buildCashFlowBuckets(data?.items ?? []);
  const hasData = buckets.some((b) => b.income > 0 || b.expense > 0);

  return (
    <View style={styles.card}>
      <View style={styles.chartWrap}>
        {hasData ? (
          <CartesianChart
            data={buckets}
            xKey="x"
            yKeys={["income", "expense"]}
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
            <Text style={styles.emptyText}>No data for this year yet</Text>
          </View>
        )}
      </View>

      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.success.text }]} />
          <Text style={styles.legendLabel}>Income</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.danger.text }]} />
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
    borderWidth: 1,
    borderColor: colors.border.default,
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 16,
  },
  chartWrap: { height: CHART_HEIGHT },
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
