import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { PieChart } from "victory-native";
import { useFont } from "@shopify/react-native-skia";

import { Screen } from "@/components/layout/Screen";
import { Header } from "@/components/layout/Header";
import { useCategories } from "@/features/finance/hooks/useCategories";
import { useTransactions } from "@/features/finance/hooks/useTransactions";
import { formatRupiah } from "@/lib/utils";
import { colors, radius, spacing } from "@/theme";

const CHART_COLORS = [
  "#D4A853", "#7DB87A", "#C97060", "#7A9EC4",
  "#B87AB8", "#A87060", "#60A8A8", "#A8A060",
  "#9E9E9E", "#D4A853",
];

export default function InsightsScreen() {
  const { data: txData } = useTransactions();
  const { data: catData } = useCategories();
  const font = useFont(null, 12);

  const chartData = useMemo(() => {
    if (!txData?.items || !catData?.items) return [];

    const categoryMap = new Map(catData.items.map((c) => [c.id, c.name]));
    const totals = new Map<string, number>();

    for (const tx of txData.items) {
      if (tx.amount >= 0) continue;
      const catName = tx.category_id ? (categoryMap.get(tx.category_id) ?? "Other") : "Other";
      totals.set(catName, (totals.get(catName) ?? 0) + Math.abs(tx.amount));
    }

    return Array.from(totals.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([label, value], i) => ({
        label,
        value,
        color: CHART_COLORS[i % CHART_COLORS.length] ?? colors.accent.primary,
      }));
  }, [txData, catData]);

  const totalExpense = useMemo(
    () => chartData.reduce((sum, d) => sum + d.value, 0),
    [chartData],
  );

  return (
    <Screen scrollable>
      <Header title="Insights" subtitle="This month's spending" />

      {chartData.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No spending data yet</Text>
          <Text style={styles.emptySubtitle}>Record transactions to see insights</Text>
        </View>
      ) : (
        <>
          <View style={styles.chartWrap}>
            <PieChart
              data={chartData.map((d) => ({ value: d.value, color: d.color, label: d.label }))}
              width={280}
              height={280}
              innerRadius={70}
              font={font}
            />
            <View style={styles.chartCenter}>
              <Text style={styles.chartTotal}>{formatRupiah(totalExpense)}</Text>
              <Text style={styles.chartLabel}>total out</Text>
            </View>
          </View>

          <View style={styles.legend}>
            {chartData.map((item) => {
              const pct = totalExpense > 0 ? ((item.value / totalExpense) * 100).toFixed(1) : "0";
              return (
                <View key={item.label} style={styles.legendRow}>
                  <View style={styles.legendLeft}>
                    <View style={[styles.dot, { backgroundColor: item.color }]} />
                    <Text style={styles.legendLabel}>{item.label}</Text>
                  </View>
                  <View style={styles.legendRight}>
                    <Text style={styles.legendPct}>{pct}%</Text>
                    <Text style={styles.legendAmount}>{formatRupiah(item.value)}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  empty: { marginTop: 64, alignItems: 'center', paddingHorizontal: spacing['2xl'] },
  emptyTitle: { fontSize: 15, fontWeight: '500', color: colors.text.muted },
  emptySubtitle: { marginTop: 4, fontSize: 13, color: colors.text.muted },

  chartWrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.lg },
  chartCenter: { position: 'absolute', alignItems: 'center' },
  chartTotal: { fontSize: 22, fontWeight: '700', color: colors.text.primary },
  chartLabel: { fontSize: 12, color: colors.text.muted, marginTop: 2 },

  legend: { paddingHorizontal: spacing['2xl'], gap: spacing.md, paddingBottom: 32 },
  legendRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  legendLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dot: { width: 10, height: 10, borderRadius: radius.full },
  legendLabel: { fontSize: 14, color: colors.text.primary },
  legendRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  legendPct: { fontSize: 12, color: colors.text.muted },
  legendAmount: { fontSize: 14, fontWeight: '500', color: colors.text.primary },
});
