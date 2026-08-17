import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, ChevronRight, PieChart } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

import EmptyState from '@/components/ui/EmptyState';
import { SkeletonList } from '@/components/ui/Skeleton';
import { useDelayedLoading } from '@/hooks/useDelayedLoading';
import CategorySpendRow from '@/features/finance/components/CategorySpendRow';
import { useCategories } from '@/features/finance/hooks/useCategories';
import { useTransactions } from '@/features/finance/hooks/useTransactions';
import { buildTopCategories } from '@/features/finance/utils/topCategoryUtils';
import { getMonthNames } from '@/lib/format';
import { colors, radius, spacing, textStyles } from '@/theme';

const TOP_N = 5;

export default function TopCategoriesCard() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const monthNames = useMemo(() => getMonthNames("long"), [i18n.language]);
  const now = new Date();

  const [selectedMonth, setSelectedMonth] = useState({
    year: now.getFullYear(),
    month: now.getMonth(),
  });

  const isCurrentMonth =
    selectedMonth.year === now.getFullYear() && selectedMonth.month === now.getMonth();

  function goBack() {
    const d = new Date(selectedMonth.year, selectedMonth.month - 1, 1);
    setSelectedMonth({ year: d.getFullYear(), month: d.getMonth() });
  }

  function goForward() {
    if (isCurrentMonth) return;
    const d = new Date(selectedMonth.year, selectedMonth.month + 1, 1);
    setSelectedMonth({ year: d.getFullYear(), month: d.getMonth() });
  }

  const dateFrom = new Date(selectedMonth.year, selectedMonth.month, 1)
    .toISOString()
    .slice(0, 10);
  const dateTo = new Date(selectedMonth.year, selectedMonth.month + 1, 0)
    .toISOString()
    .slice(0, 10);

  const { data: txData, isLoading: txLoading, error: txError } = useTransactions({
    dateFrom,
    dateTo,
    limit: 200,
  });
  const { data: categoriesData, isLoading: catLoading } = useCategories();

  const isLoading = txLoading || catLoading;
  const showSkeleton = useDelayedLoading(isLoading);

  const { rows } = useMemo(
    () =>
      buildTopCategories(txData?.items ?? [], categoriesData ?? [], TOP_N),
    [txData, categoriesData],
  );

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>{t("home.topCategories.title")}</Text>
        <View style={styles.monthPicker}>
          <Pressable hitSlop={8} onPress={goBack}>
            <ChevronLeft size={14} color={colors.text.secondary} strokeWidth={2} />
          </Pressable>
          <Text style={styles.monthLabel}>
            {monthNames[selectedMonth.month].slice(0, 3)} {selectedMonth.year}
          </Text>
          <Pressable hitSlop={8} onPress={goForward} style={{ opacity: isCurrentMonth ? 0.3 : 1 }}>
            <ChevronRight size={14} color={colors.text.secondary} strokeWidth={2} />
          </Pressable>
        </View>
      </View>

      {showSkeleton ? (
        <SkeletonList count={3} />
      ) : txError ? (
        <EmptyState
          icon={PieChart}
          title={t("home.topCategories.loadFailedTitle")}
          subtitle={t("home.topCategories.loadFailedSub")}
        />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={PieChart}
          title={t("home.topCategories.emptyTitle")}
          subtitle={t("home.topCategories.emptySub", { month: monthNames[selectedMonth.month] })}
        />
      ) : (
        <View style={styles.list}>
          {rows.map((row, i) => (
            <View key={row.categoryId ?? 'uncategorized'}>
              <CategorySpendRow
                row={row}
                onPress={() =>
                  router.push({
                    pathname: '/(app)/history',
                    params: {
                      categoryId: row.categoryId ?? '',
                      year: String(selectedMonth.year),
                      month: String(selectedMonth.month),
                    },
                  })
                }
              />
              {i < rows.length - 1 && <View style={styles.divider} />}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bg.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
    marginHorizontal: spacing['2xl'],
    marginBottom: spacing.lg,
    padding: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  title: {
    ...StyleSheet.flatten(textStyles.overline),
    fontSize: 11,
    letterSpacing: 0.8,
  },
  monthPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.bg.elevated,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  monthLabel: {
    ...StyleSheet.flatten(textStyles.caption),
    fontSize: 12,
    fontWeight: '500',
    color: colors.text.primary,
  },
  list: { gap: 0 },
  divider: { height: 1, backgroundColor: colors.border.subtle },
});
