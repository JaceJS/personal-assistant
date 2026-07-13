import { StyleSheet, Text, View } from "react-native";
import { TrendingDown, TrendingUp } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { useWeeklySummary } from "@/features/finance/hooks/useWeeklySummary";
import { SkeletonText } from "@/components/ui/Skeleton";
import { formatMoney, getMonthNames } from "@/lib/format";
import { colors, radius, spacing, textStyles } from "@/theme";

export default function WeeklySummaryCard() {
  const { t } = useTranslation();
  const { income, expense, net, hasTransactions, isLoading, dateFrom, dateTo } = useWeeklySummary();

  const formattedRange = (() => {
    const months = getMonthNames("short");
    const monthName = (mm: string) => months[parseInt(mm, 10) - 1] ?? mm;
    const [, fromM, fromD] = dateFrom.split("-");
    const [, toM, toD] = dateTo.split("-");
    if (fromM === toM) return `${parseInt(fromD, 10)} - ${parseInt(toD, 10)} ${monthName(fromM)}`;
    return `${parseInt(fromD, 10)} ${monthName(fromM)} - ${parseInt(toD, 10)} ${monthName(toM)}`;
  })();

  const netPositive = net >= 0;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>{t("home.weeklySummary.title")}</Text>
        <Text style={styles.range}>{formattedRange}</Text>
      </View>

      {isLoading ? (
        <View style={styles.skeletonRow}>
          <SkeletonText width={100} height={18} />
          <SkeletonText width={100} height={18} />
        </View>
      ) : !hasTransactions ? (
        <Text style={styles.emptyText}>{t("home.weeklySummary.emptyText")}</Text>
      ) : (
        <>
          <View style={styles.row}>
            <StatItem
              label={t("transaction.income")}
              value={formatMoney(income)}
              icon={<TrendingUp size={14} color={colors.success.text} />}
              valueColor={colors.success.text}
            />
            <View style={styles.dividerV} />
            <StatItem
              label={t("transaction.expense")}
              value={formatMoney(expense)}
              icon={<TrendingDown size={14} color={colors.danger.text} />}
              valueColor={colors.danger.text}
            />
          </View>

          <View style={styles.netRow}>
            <Text style={styles.netLabel}>{t("home.weeklySummary.net")}</Text>
            <Text style={[styles.netValue, { color: netPositive ? colors.success.text : colors.danger.text }]}>
              {netPositive ? "+" : ""}
              {formatMoney(net)}
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
  emptyText: {
    ...StyleSheet.flatten(textStyles.body),
    color: colors.text.muted,
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
