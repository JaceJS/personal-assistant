import React, { useCallback, useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { ChevronLeft, Wallet, X } from "lucide-react-native";

import { Header } from "@/components/layout/Header";
import { Screen } from "@/components/layout/Screen";
import EmptyState from "@/components/ui/EmptyState";
import { SkeletonCard } from "@/components/ui/Skeleton";
import BudgetBucketItem from "@/features/finance/components/BudgetBucketItem";
import BudgetHeroCard from "@/features/finance/components/BudgetHeroCard";
import FixedExpenseItem from "@/features/finance/components/FixedExpenseItem";
import YearlyPerformanceSection from "@/features/finance/components/YearlyPerformanceSection";
import { useBudget, useUpsertBudget } from "@/features/finance/hooks/useBudget";
import { useCategories } from "@/features/finance/hooks/useCategories";
import { useTransactions } from "@/features/finance/hooks/useTransactions";
import type { Category } from "@/features/finance/types";
import { useToastStore } from "@/stores/toast";
import { colors, radius, spacing, textStyles } from "@/theme";
import { useRouter } from "expo-router";
import Button from "@/components/ui/Button";

function SectionHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action}
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
  const [inputValue, setInputValue] = useState("");

  const { data: budget, isLoading: budgetLoading, refetch: refetchBudget } = useBudget();
  const { data: categories } = useCategories();
  const { mutate: saveBudget, isPending } = useUpsertBudget();
  const showToast = useToastStore((s) => s.showToast);

  const {
    data: currentYearData,
    isLoading: txLoading,
    refetch: refetchTx,
  } = useTransactions({
    dateFrom: `${currentYear}-01-01`,
    dateTo: `${currentYear}-12-31`,
    limit: 1000,
  });

  const { data: selectedYearData, isLoading: chartLoading } = useTransactions({
    dateFrom: `${selectedYear}-01-01`,
    dateTo: `${selectedYear}-12-31`,
    limit: 1000,
  });

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(app)/settings");
    }
  };

  const backButton = (
    <Pressable onPress={handleBack} style={({ pressed }) => pressed && { opacity: 0.6 }}>
      <ChevronLeft size={22} color={colors.text.muted} />
    </Pressable>
  );

  const currentYearTransactions = currentYearData?.items ?? [];
  const selectedYearTransactions = selectedYearData?.items ?? [];

  const currentMonthSpent = useMemo(() => {
    return currentYearTransactions
      .filter((t) => {
        const d = new Date(t.occurred_at);
        return d.getFullYear() === currentYear && d.getMonth() === currentMonth && t.amount < 0;
      })
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);
  }, [currentYearTransactions, currentYear, currentMonth]);

  const categorySpending = useMemo(() => {
    const map = new Map<string, number>();
    currentYearTransactions
      .filter((t) => {
        const d = new Date(t.occurred_at);
        return d.getFullYear() === currentYear && d.getMonth() === currentMonth && t.amount < 0;
      })
      .forEach((t) => {
        if (t.category_id) {
          map.set(t.category_id, (map.get(t.category_id) ?? 0) + Math.abs(t.amount));
        }
      });
    return map;
  }, [currentYearTransactions, currentYear, currentMonth]);

  const expenseCategories = useMemo<Category[]>(
    () =>
      (categories ?? [])
        .filter((c) => c.type === "expense" && !c.is_archived)
        .sort((a, b) => (categorySpending.get(b.id) ?? 0) - (categorySpending.get(a.id) ?? 0)),
    [categories, categorySpending]
  );

  const topCategories = expenseCategories.slice(0, 3);

  const handleOpenEdit = useCallback(() => {
    setInputValue(budget?.monthly_limit ? String(budget.monthly_limit) : "");
    setEditVisible(true);
  }, [budget?.monthly_limit]);

  const hasValidInput = Number(inputValue.replace(/\D/g, "")) > 0;

  const handleSave = useCallback(() => {
    const amount = Number(inputValue.replace(/\D/g, ""));
    if (!amount) return;
    saveBudget(
      { monthly_limit: amount },
      {
        onSuccess: () => setEditVisible(false),
        onError: () => showToast("Failed to save budget", "error"),
      }
    );
  }, [inputValue, saveBudget, showToast]);

  const handleRefresh = useCallback(async () => {
    await Promise.all([refetchBudget(), refetchTx()]);
  }, [refetchBudget, refetchTx]);

  const isRefreshing = budgetLoading || txLoading;

  return (
    <Screen>
      <Header title="Budget" left={backButton} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
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
            <View style={styles.card}>
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
            </View>
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
            <View style={styles.card}>
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
            </View>
          )}
        </View>
      </ScrollView>

      <Modal
        visible={editVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setEditVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.overlay}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <Pressable style={styles.overlayBg} onPress={() => setEditVisible(false)} />
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>
                {budget ? "Update Budget" : "Set Monthly Budget"}
              </Text>
              <Pressable style={styles.closeBtn} onPress={() => setEditVisible(false)}>
                <X size={18} color={colors.text.secondary} strokeWidth={1.5} />
              </Pressable>
            </View>

            <TextInput
              style={styles.input}
              value={inputValue}
              onChangeText={setInputValue}
              keyboardType="numeric"
              placeholder="e.g. 10000000"
              placeholderTextColor={colors.text.disabled}
              autoFocus
            />
            <Text style={styles.inputHint}>Amount in Rupiah (IDR)</Text>

            <Button
              disabled={!hasValidInput || isPending}
              variant="primary"
              onPress={handleSave}
              label={isPending ? "Saving…" : "Save Budget"}
            />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: spacing["2xl"],
    paddingTop: 8,
    paddingBottom: 48,
    gap: 0,
  },

  section: { marginTop: 24 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sectionTitle: { ...StyleSheet.flatten(textStyles.h2), color: colors.text.primary },

  card: {
    backgroundColor: colors.bg.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
    overflow: "hidden",
  },
  divider: {
    height: 1,
    backgroundColor: colors.border.subtle,
    marginLeft: 76,
  },

  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  overlayBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  sheet: {
    backgroundColor: colors.bg.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing["2xl"],
    paddingTop: spacing["2xl"],
    paddingBottom: 40,
    gap: spacing.md,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  sheetTitle: { ...StyleSheet.flatten(textStyles.h2), color: colors.text.primary },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: colors.bg.elevated,
    alignItems: "center",
    justifyContent: "center",
  },

  input: {
    backgroundColor: colors.bg.elevated,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
    paddingHorizontal: 16,
    paddingVertical: 14,
    ...StyleSheet.flatten(textStyles.h2),
    color: colors.text.primary,
  },
  inputHint: {
    ...StyleSheet.flatten(textStyles.caption),
    color: colors.text.muted,
    marginLeft: 4,
  },

  saveBtn: {
    backgroundColor: colors.accent.primary,
    borderRadius: radius.lg,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: spacing.sm,
  },
  saveBtnDisabled: { opacity: 0.45 },
  saveBtnText: {
    ...StyleSheet.flatten(textStyles.h3),
    color: colors.bg.canvas,
  },
});
