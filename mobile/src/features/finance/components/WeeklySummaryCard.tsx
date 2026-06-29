import { StyleSheet, Text, View } from "react-native";
import { TrendingDown, TrendingUp } from "lucide-react-native";
import { useWeeklySummary } from "@/features/finance/hooks/useWeeklySummary";
import { SkeletonText } from "@/components/ui/Skeleton";
import { formatRupiah } from "@/lib/utils";
import { colors, radius, spacing, textStyles } from "@/theme";

export default function WeeklySummaryCard() {
  const { income, expense, net, isLoading, dateFrom, dateTo } = useWeeklySummary();

  const formattedRange = (() => {
    const [, fromM, fromD] = dateFrom.split("-");
    const [, toM, toD] = dateTo.split("-");
    if (fromM === toM) return `${parseInt(fromD, 10)} - ${parseInt(toD, 10)} ${monthName(fromM)}`;
    return `${parseInt(fromD, 10)} ${monthName(fromM)} - ${parseInt(toD, 10)} ${monthName(toM)}`;
  })();

  const netPositive = net >= 0;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>Minggu Ini</Text>
        <Text style={styles.range}>{formattedRange}</Text>
      </View>

      {isLoading ? (
        <View style={styles.skeletonRow}>
          <SkeletonText width={100} height={18} />
          <SkeletonText width={100} height={18} />
        </View>
      ) : (
        <>
          <View style={styles.row}>
            <StatItem
              label="Pemasukan"
              value={formatRupiah(income)}
              icon={<TrendingUp size={14} color={colors.success.text} />}
              valueColor={colors.success.text}
            />
            <View style={styles.dividerV} />
            <StatItem
              label="Pengeluaran"
              value={formatRupiah(expense)}
              icon={<TrendingDown size={14} color={colors.danger.text} />}
              valueColor={colors.danger.text}
            />
          </View>

          <View style={styles.netRow}>
            <Text style={styles.netLabel}>Selisih</Text>
            <Text style={[styles.netValue, { color: netPositive ? colors.success.text : colors.danger.text }]}>
              {netPositive ? "+" : ""}
              {formatRupiah(net)}
            </Text>
          </View>
        </>
      )}
    </View>
  );
}

function StatItem({
  label,
  value,
  icon,
  valueColor,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  valueColor: string;
}) {
  return (
    <View style={styles.statItem}>
      <View style={styles.statLabelRow}>
        {icon}
        <Text style={styles.statLabel}>{label}</Text>
      </View>
      <Text style={[styles.statValue, { color: valueColor }]}>{value}</Text>
    </View>
  );
}

function monthName(mm: string): string {
  const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
  return months[parseInt(mm, 10) - 1] ?? mm;
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
    gap: spacing.lg,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    ...StyleSheet.flatten(textStyles.h3),
    color: colors.text.primary,
  },
  range: {
    ...StyleSheet.flatten(textStyles.caption),
    color: colors.text.muted,
  },
  skeletonRow: {
    flexDirection: "row",
    gap: spacing.lg,
  },
  row: {
    flexDirection: "row",
    gap: spacing.lg,
  },
  dividerV: {
    width: 1,
    backgroundColor: colors.border.subtle,
  },
  statItem: {
    flex: 1,
    gap: 4,
  },
  statLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statLabel: {
    ...StyleSheet.flatten(textStyles.caption),
    color: colors.text.muted,
  },
  statValue: {
    ...StyleSheet.flatten(textStyles.h3),
    fontSize: 14,
  },
  netRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
    paddingTop: spacing.md,
  },
  netLabel: {
    ...StyleSheet.flatten(textStyles.caption),
    color: colors.text.muted,
  },
  netValue: {
    ...StyleSheet.flatten(textStyles.h3),
    fontSize: 15,
  },
});
