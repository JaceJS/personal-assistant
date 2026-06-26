import { useCallback, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Plus } from 'lucide-react-native';

import { Header } from '@/components/layout/Header';
import { Screen } from '@/components/layout/Screen';
import Button from '@/components/ui/Button';
import { SkeletonCard } from '@/components/ui/Skeleton';
import SavingsGoalCard from '@/features/finance/components/SavingsGoalCard';
import SavingsGoalFormSheet from '@/features/finance/components/SavingsGoalFormSheet';
import { useCreateSavingsGoal, useSavingsGoals } from '@/features/finance/hooks/useSavingsGoals';
import type { SavingsGoal, SavingsGoalCreate } from '@/features/finance/types';
import { useToastStore } from '@/stores/toast';
import { colors, radius, spacing, textStyles } from '@/theme';

export default function GoalsScreen() {
  const router = useRouter();
  const { data: goals, isLoading, isRefetching, refetch } = useSavingsGoals();
  const createGoal = useCreateSavingsGoal();
  const { showToast } = useToastStore();
  const [showForm, setShowForm] = useState(false);

  const handleCreate = useCallback(
    async (data: SavingsGoalCreate) => {
      try {
        await createGoal.mutateAsync(data);
        setShowForm(false);
        showToast('Goal dibuat!', 'success');
      } catch {
        showToast('Gagal membuat goal. Coba lagi.', 'error');
      }
    },
    [createGoal, showToast],
  );

  const handleGoalPress = useCallback(
    (goal: SavingsGoal) => {
      router.push(`/(app)/goals/${goal.id}`);
    },
    [router],
  );

  const active = goals?.filter((g) => !g.is_archived) ?? [];
  const completed = active.filter((g) => g.is_completed);
  const ongoing = active.filter((g) => !g.is_completed);

  const addButton = (
    <Pressable
      onPress={() => setShowForm(true)}
      hitSlop={8}
      style={({ pressed }) => pressed && { opacity: 0.7 }}
    >
      <View style={styles.addBtn}>
        <Plus size={18} color={colors.accent.primary} strokeWidth={2} />
      </View>
    </Pressable>
  );

  return (
    <Screen>
      <Header title="Goal" right={addButton} />

      {isLoading ? (
        <View style={styles.skeletonWrap}>
          <SkeletonCard height={110} />
          <SkeletonCard height={110} />
          <SkeletonCard height={110} />
        </View>
      ) : active.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyEmoji}>🎯</Text>
          <Text style={styles.emptyTitle}>Belum ada goal</Text>
          <Text style={styles.emptySubtitle}>
            Mulai simpan untuk DP motor, liburan, atau dana darurat.
          </Text>
          <Button
            label="Buat Goal Pertama"
            onPress={() => setShowForm(true)}
            variant="primary"
          />
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
              <Text style={styles.sectionLabel}>Sedang Berjalan</Text>
            ) : null
          }
          ListFooterComponent={
            completed.length > 0 ? (
              <Text style={[styles.sectionLabel, styles.completedLabel]}>Sudah Tercapai</Text>
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
    padding: spacing['2xl'],
    gap: spacing.md,
  },
  list: {
    paddingHorizontal: spacing['2xl'],
    paddingBottom: 80,
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
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing['3xl'],
    gap: spacing.md,
  },
  emptyEmoji: { fontSize: 48, marginBottom: spacing.sm },
  emptyTitle: {
    ...StyleSheet.flatten(textStyles.h2),
    color: colors.text.primary,
    textAlign: 'center',
  },
  emptySubtitle: {
    ...StyleSheet.flatten(textStyles.caption),
    color: colors.text.muted,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.accent.subtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
