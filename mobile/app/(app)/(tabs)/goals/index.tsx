import { useCallback, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Plus } from "lucide-react-native";
import { useTranslation } from "react-i18next";

import { Header } from "@/components/layout/Header";
import { Screen } from "@/components/layout/Screen";
import { HeaderButton } from "@/components/ui/HeaderButton";
import Button from "@/components/ui/Button";
import { SkeletonCard } from "@/components/ui/Skeleton";
import SavingsGoalCard from "@/features/finance/components/SavingsGoalCard";
import SavingsGoalFormSheet from "@/features/finance/components/SavingsGoalFormSheet";
import { useCreateSavingsGoal, useSavingsGoals } from "@/features/finance/hooks/useSavingsGoals";
import { useDelayedLoading } from "@/hooks/useDelayedLoading";
import type { SavingsGoal, SavingsGoalCreate } from "@/features/finance/types";
import { useToastStore } from "@/stores/toast";
import { colors, radius, spacing, textStyles } from "@/theme";
import { TAB_BAR_CLEARANCE } from "@/components/ui/FloatingTabBar";

export default function GoalsScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { data: goals, isLoading, isRefetching, refetch } = useSavingsGoals();
  const showSkeleton = useDelayedLoading(isLoading);
  const createGoal = useCreateSavingsGoal();
  const { showToast } = useToastStore();
  const [showForm, setShowForm] = useState(false);

  const handleCreate = useCallback(
    async (data: SavingsGoalCreate) => {
      try {
        await createGoal.mutateAsync(data);
        setShowForm(false);
        showToast(t("goals.createdToast"), "success");
      } catch {
        showToast(t("goals.createError"), "error");
      }
    },
    [createGoal, showToast, t]
  );

  const handleGoalPress = useCallback(
    (goal: SavingsGoal) => {
      router.push(`/(app)/goals/${goal.id}`);
    },
    [router]
  );

  const active = goals?.filter((g) => !g.is_archived) ?? [];
  const completed = active.filter((g) => g.is_completed);
  const ongoing = active.filter((g) => !g.is_completed);

  const addButton = (
    <HeaderButton icon={Plus} onPress={() => setShowForm(true)} accessibilityLabel={t("goals.addA11y")} />
  );

  return (
    <Screen>
      <Header title={t("tabs.goals")} right={addButton} />

      {showSkeleton ? (
        <View style={styles.skeletonWrap}>
          <SkeletonCard height={110} />
          <SkeletonCard height={110} />
          <SkeletonCard height={110} />
        </View>
      ) : active.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyEmoji}>🎯</Text>
          <Text style={styles.emptyTitle}>{t("goals.emptyTitle")}</Text>
          <Text style={styles.emptySubtitle}>{t("goals.emptySubtitle")}</Text>
          <Button label={t("goals.createFirstCta")} onPress={() => setShowForm(true)} variant="primary" />
        </View>
      ) : (
        <FlatList
          data={[...ongoing, ...completed]}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <SavingsGoalCard goal={item} onPress={() => handleGoalPress(item)} />
          )}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={colors.accent.primary}
            />
          }
          ListHeaderComponent={
            ongoing.length > 0 && completed.length > 0 ? (
              <Text style={styles.sectionLabel}>{t("goals.ongoingLabel")}</Text>
            ) : null
          }
          ListFooterComponent={
            completed.length > 0 ? (
              <Text style={[styles.sectionLabel, styles.completedLabel]}>{t("goals.completedLabel")}</Text>
            ) : null
          }
        />
      )}

      <SavingsGoalFormSheet
        isVisible={showForm}
        onDismiss={() => setShowForm(false)}
        onSave={handleCreate}
        isPending={createGoal.isPending}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  skeletonWrap: {
    padding: spacing["2xl"],
    gap: spacing.md,
  },
  list: {
    paddingHorizontal: spacing["2xl"],
    paddingBottom: TAB_BAR_CLEARANCE,
    paddingTop: spacing.sm,
  },
  separator: { height: spacing.md },
  sectionLabel: {
    ...StyleSheet.flatten(textStyles.overline),
    color: colors.text.muted,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  completedLabel: { marginTop: spacing.xl },
  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing["3xl"],
    gap: spacing.md,
  },
  emptyEmoji: { fontSize: 48, marginBottom: spacing.sm },
  emptyTitle: {
    ...StyleSheet.flatten(textStyles.h2),
    color: colors.text.primary,
    textAlign: "center",
  },
  emptySubtitle: {
    ...StyleSheet.flatten(textStyles.caption),
    color: colors.text.muted,
    textAlign: "center",
    marginBottom: spacing.sm,
  },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.accent.subtle,
    alignItems: "center",
    justifyContent: "center",
  },
});
