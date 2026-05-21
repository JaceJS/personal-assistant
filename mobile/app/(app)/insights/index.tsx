import { useMemo } from "react";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { PieChart } from "victory-native";
import { useFont } from "@shopify/react-native-skia";

import { useCategories } from "@/features/finance/hooks/useCategories";
import { useTransactions } from "@/features/finance/hooks/useTransactions";
import { formatRupiah } from "@/lib/utils";

const COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#f43f5e", "#f97316",
  "#eab308", "#10b981", "#14b8a6", "#06b6d4", "#3b82f6",
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
      const catName = tx.category_id ? (categoryMap.get(tx.category_id) ?? "Lainnya") : "Lainnya";
      totals.set(catName, (totals.get(catName) ?? 0) + Math.abs(tx.amount));
    }

    return Array.from(totals.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([label, value], i) => ({
        label,
        value,
        color: COLORS[i % COLORS.length] ?? "#6366f1",
      }));
  }, [txData, catData]);

  const totalExpense = useMemo(
    () => chartData.reduce((sum, d) => sum + d.value, 0),
    [chartData]
  );

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView className="flex-1">
        {/* Header */}
        <View className="px-6 py-4">
          <Text className="font-bold text-2xl text-ink">Insights</Text>
          <Text className="mt-0.5 text-sm text-muted">Pengeluaran bulan ini</Text>
        </View>

        {chartData.length === 0 ? (
          <View className="mt-16 items-center px-6">
            <Text className="font-medium text-base text-muted">Belum ada data pengeluaran</Text>
            <Text className="mt-1 text-sm text-muted">Catat transaksi untuk melihat insights</Text>
          </View>
        ) : (
          <>
            {/* Pie chart */}
            <View className="items-center py-4">
              <PieChart
                data={chartData.map((d) => ({ value: d.value, color: d.color, label: d.label }))}
                width={280}
                height={280}
                innerRadius={70}
                font={font}
              />
              <View className="absolute items-center">
                <Text className="font-bold text-2xl text-ink">{formatRupiah(totalExpense)}</Text>
                <Text className="text-xs text-muted">total keluar</Text>
              </View>
            </View>

            {/* Legend */}
            <View className="mx-6 gap-3 pb-8">
              {chartData.map((item) => {
                const pct = totalExpense > 0 ? ((item.value / totalExpense) * 100).toFixed(1) : "0";
                return (
                  <View key={item.label} className="flex-row items-center justify-between">
                    <View className="flex-row items-center gap-2.5">
                      <View
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <Text className="text-sm text-ink">{item.label}</Text>
                    </View>
                    <View className="flex-row items-center gap-3">
                      <Text className="text-xs text-muted">{pct}%</Text>
                      <Text className="font-medium text-sm text-ink">{formatRupiah(item.value)}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
