import React, { useCallback, useMemo, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { ChevronLeft, Wallet } from 'lucide-react-native';
import { useRouter } from 'expo-router';

import { Header } from '@/components/layout/Header';
import { Screen } from '@/components/layout/Screen';
import Card from '@/components/ui/Card';
import EmptyState from '@/components/ui/EmptyState';
import { SkeletonCard } from '@/components/ui/Skeleton';
import BudgetBucketItem from '@/features/finance/components/BudgetBucketItem';
import BudgetEditSheet from '@/features/finance/components/BudgetEditSheet';
import BudgetHeroCard from '@/features/finance/components/BudgetHeroCard';
import FixedExpenseItem from '@/features/finance/components/FixedExpenseItem';
import YearlyPerformanceSection from '@/features/finance/components/YearlyPerformanceSection';
import { useBudget, useUpsertBudget } from '@/features/finance/hooks/useBudget';
import { useCategories } from '@/features/finance/hooks/useCategories';
import { useTransactions } from '@/features/finance/hooks/useTransactions';
import type { Category } from '@/features/finance/types';
import { useToastStore } from '@/stores/toast';
import { colors, spacing, textStyles } from '@/theme';

const CARD_STYLE = { padding: 0, overflow: 'hidden' as const, borderWidth: 1, borderColor: colors.border.default };

function SectionHeader({ title }: { title: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

export default function BudgetScreen() {
  const router = useRouter();
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [editVisible, setEditVisible] = useState(false);

  const { data: budget, isLoading: budgetLoading, refetch: refetchBudget } = useBudget();
  const { data: categories } = useCategories();
  const { mutate: saveBudget, isPending } = useUpsertBudget();
  const showToast = useToastStore(s => s.showToast);

  const { data: currentYearData, isLoading: txLoading, refetch: refetchTx } = useTransactions({
    dateFrom: `${currentYear}-01-01`,
    dateTo: `${currentYear}-12-31`,
    limit: 1000,
  });

  const { data: selectedYearData, isLoading: chartLoading } = useTransactions({
    dateFrom: `${selectedYear}-01-01`,
    dateTo: `${selectedYear}-12-31`,
    limit: 1000,
  });

  const currentYearTransactions = currentYearData?.items ?? [];
  const selectedYearTransactions = selectedYearData?.items ?? [];

  const currentMonthSpent = useMemo(() => {
    return currentYearTransactions
      .filter(t => {
        const d = new Date(t.occurred_at);
        return d.getFullYear() === currentYear && d.getMonth() === currentMonth && t.amount < 0;
      })
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);
  }, [currentYearTransactions, currentYear, currentMonth]);

  const categorySpending = useMemo(() => {
    const map = new Map<string, number>();
    currentYearTransactions
      .filter(t => {
        const d = new Date(t.occurred_at);
        return d.getFullYear() === currentYear && d.getMonth() === currentMonth && t.amount < 0;
      })
      .forEach(t => {
        if (t.category_id) {
          map.set(t.category_id, (map.get(t.category_id) ?? 0) + Math.abs(t.amount));
        }
      });
    return map;
  }, [currentYearTransactions, currentYear, currentMonth]);

  const expenseCategories = useMemo<Category[]>(() =>
    (categories ?? [])
      .filter(c => c.type === 'expense' && !c.is_archived)
      .sort((a, b) => (categorySpending.get(b.id) ?? 0) - (categorySpending.get(a.id) ?? 0)),
  [categories, categorySpending]);

  const topCategories = expenseCategories.slice(0, 3);

  const handleOpenEdit = useCallback(() => setEditVisible(true), []);

  const handleSave = useCallback((amount: number) => {
    saveBudget(
      { monthly_limit: amount },
      {
        onSuccess: () => setEditVisible(false),
        onError: () => showToast('Failed to save budget', 'error'),
      }
    );
  }, [saveBudget, showToast]);

  const handleRefresh = useCallback(async () => {
    await Promise.all([refetchBudget(), refetchTx()]);
  }, [refetchBudget, refetchTx]);

  const backButton = (
    <Pressable
      onPress={() => router.canGoBack() ? router.back() : router.replace('/(app)/settings')}
      style={({ pressed }) => pressed && { opacity: 0.6 }}
    >
      <ChevronLeft size={22} color={colors.text.muted} />
    </Pressable>
  );

  return (
    <Screen>
      <Header title="Budget" left={backButton} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={budgetLoading || txLoading}
            onRefresh={handleRefresh}
            tintColor={colors.accent.primary}
          />
        }
      >
        {budgetLoading ? (
          <SkeletonCard height={120} />
        ) : (
          <BudgetHeroCard
            budget={budget ?? null}
            totalSpent={currentMonthSpent}
            onEdit={handleOpenEdit}
          />
        )}

        <YearlyPerformanceSection
          transactions={selectedYearTransactions}
          year={selectedYear}
          onYearChange={setSelectedYear}
          isLoading={chartLoading}
        />

        {topCategories.length > 0 && (
          <View style={styles.section}>
            <SectionHeader title="Fixed Expenses" />
            <Card style={CARD_STYLE}>
              {topCategories.map((cat, idx) => (
                <React.Fragment key={cat.id}>
                  <FixedExpenseItem
                    category={cat}
                    spent={categorySpending.get(cat.id) ?? 0}
                    subtitle="Avg. Monthly"
                  />
                  {idx < topCategories.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </Card>
          </View>
        )}

        <View style={styles.section}>
          <SectionHeader title="Budget Buckets" />
          {expenseCategories.length === 0 ? (
            <EmptyState
              icon={Wallet}
              title="No expense categories"
              subtitle="Add categories to track your spending"
            />
          ) : (
            <Card style={CARD_STYLE}>
              {expenseCategories.map((cat, idx) => (
                <React.Fragment key={cat.id}>
                  <BudgetBucketItem
                    category={cat}
                    spent={categorySpending.get(cat.id) ?? 0}
                    totalBudget={budget?.monthly_limit ?? 0}
                  />
                  {idx < expenseCategories.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </Card>
          )}
        </View>
      </ScrollView>

      <BudgetEditSheet
        isVisible={editVisible}
        onDismiss={() => setEditVisible(false)}
        onSave={handleSave}
        initialValue={budget?.monthly_limit}
        isPending={isPending}
        isUpdate={!!budget}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: spacing['2xl'],
    paddingBottom: 160,
    gap: 8,
  },
  section: { marginTop: 24 },
  sectionHeader: { marginBottom: 12 },
  sectionTitle: { ...StyleSheet.flatten(textStyles.h2), color: colors.text.primary },
  divider: {
    height: 1,
    backgroundColor: colors.border.subtle,
    marginLeft: 76,
  },
});
