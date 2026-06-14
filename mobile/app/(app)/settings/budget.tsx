import React, { useCallback, useMemo, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { ChevronLeft, Plus, Wallet } from 'lucide-react-native';
import IconButton from '@/components/ui/IconButton';
import { useRouter } from 'expo-router';
import { computeUnallocated } from '@/features/finance/utils/budgetBucketUtils';
import { splitBudgetCategories } from '@/features/finance/utils/budgetCategoryUtils';

import { Header } from '@/components/layout/Header';
import { Screen } from '@/components/layout/Screen';
import Card from '@/components/ui/Card';
import EmptyState from '@/components/ui/EmptyState';
import { SkeletonCard } from '@/components/ui/Skeleton';
import AddSpendingLimitSheet from '@/features/finance/components/AddSpendingLimitSheet';
import BudgetBucketItem from '@/features/finance/components/BudgetBucketItem';
import BudgetEditSheet from '@/features/finance/components/BudgetEditSheet';
import BudgetHeroCard from '@/features/finance/components/BudgetHeroCard';
import CategoryBudgetSheet from '@/features/finance/components/CategoryBudgetSheet';
import FixedExpenseItem from '@/features/finance/components/FixedExpenseItem';
import YearlyPerformanceSection from '@/features/finance/components/YearlyPerformanceSection';
import { useBudget, useUpsertBudget } from '@/features/finance/hooks/useBudget';
import { useCategories } from '@/features/finance/hooks/useCategories';
import type { Category } from '@/features/finance/types';
import { useTransactions } from '@/features/finance/hooks/useTransactions';
import { formatRupiah } from '@/lib/utils';
import { useToastStore } from '@/stores/toast';
import { colors, radius, spacing, textStyles } from '@/theme';

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

function UnallocatedChip({ unallocated }: { unallocated: number }) {
  const isOver = unallocated < 0;
  return (
    <View style={[styles.chip, isOver ? styles.chipOver : styles.chipOk]}>
      <Text style={[styles.chipText, { color: isOver ? colors.danger.text : colors.success.text }]}>
        {isOver ? `Rp ${formatRupiah(Math.abs(unallocated))} over` : `${formatRupiah(unallocated)} free`}
      </Text>
    </View>
  );
}

export default function BudgetScreen() {
  const router = useRouter();
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [editVisible, setEditVisible] = useState(false);
  const [addSheetVisible, setAddSheetVisible] = useState(false);
  const [categoryToAdd, setCategoryToAdd] = useState<Category | null>(null);

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

  const { bills, spending } = useMemo(
    () => splitBudgetCategories(
      (categories ?? []).sort((a, b) => (categorySpending.get(b.id) ?? 0) - (categorySpending.get(a.id) ?? 0)),
    ),
    [categories, categorySpending],
  );

  const available = useMemo(() => {
    const budgetedIds = new Set([...bills.map(c => c.id), ...spending.map(c => c.id)]);
    return (categories ?? []).filter(
      c => c.type === 'expense' && !c.is_archived && !budgetedIds.has(c.id),
    );
  }, [categories, bills, spending]);

  const handleSelectCategory = useCallback((cat: Category) => {
    setAddSheetVisible(false);
    setCategoryToAdd(cat);
  }, []);

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

        <View style={styles.section}>
          <SectionHeader title="Monthly Bills" />
          {bills.length === 0 ? (
            <Card style={CARD_STYLE}>
              <View style={styles.emptyFixed}>
                <Text style={styles.emptyFixedText}>
                  No monthly bills yet. Open any spending category and toggle "Fixed monthly expense" to commit it.
                </Text>
              </View>
            </Card>
          ) : (
            <Card style={CARD_STYLE}>
              {bills.map((cat, idx) => (
                <React.Fragment key={cat.id}>
                  <FixedExpenseItem
                    category={cat}
                    spent={categorySpending.get(cat.id) ?? 0}
                  />
                  {idx < bills.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </Card>
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Spending Limits</Text>
            <View style={styles.sectionHeaderRight}>
              {budget && (bills.length > 0 || spending.length > 0) && (
                <UnallocatedChip
                  unallocated={computeUnallocated(budget.monthly_limit, [...bills, ...spending])}
                />
              )}
              <IconButton
                icon={Plus}
                onPress={() => setAddSheetVisible(true)}
                accessibilityLabel="Add spending limit"
              />
            </View>
          </View>
          {spending.length === 0 ? (
            <EmptyState
              icon={Wallet}
              title="No spending limits"
              subtitle="Tap + to add a category and set a monthly limit"
            />
          ) : (
            <Card style={CARD_STYLE}>
              {spending.map((cat, idx) => (
                <React.Fragment key={cat.id}>
                  <BudgetBucketItem
                    category={cat}
                    spent={categorySpending.get(cat.id) ?? 0}
                  />
                  {idx < spending.length - 1 && <Divider />}
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

      <AddSpendingLimitSheet
        categories={available}
        isVisible={addSheetVisible}
        onDismiss={() => setAddSheetVisible(false)}
        onSelect={handleSelectCategory}
      />

      <CategoryBudgetSheet
        category={categoryToAdd}
        isVisible={categoryToAdd !== null}
        onDismiss={() => setCategoryToAdd(null)}
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
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: { ...StyleSheet.flatten(textStyles.h2), color: colors.text.primary },
  divider: {
    height: 1,
    backgroundColor: colors.border.subtle,
    marginLeft: 76,
  },
  sectionHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  chip: {
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  chipOk: { backgroundColor: colors.success.bg },
  chipOver: { backgroundColor: colors.danger.bg },
  chipText: { fontSize: 11, fontWeight: '600' },
  emptyFixed: { paddingHorizontal: 16, paddingVertical: 20 },
  emptyFixedText: { fontSize: 13, color: colors.text.muted, lineHeight: 20 },
});
