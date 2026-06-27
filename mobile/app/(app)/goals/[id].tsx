import { useCallback, useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, Pencil, Trash2 } from 'lucide-react-native';

import { Header } from '@/components/layout/Header';
import { Screen } from '@/components/layout/Screen';
import Button from '@/components/ui/Button';
import { SkeletonCard } from '@/components/ui/Skeleton';
import ContributeSheet from '@/features/finance/components/ContributeSheet';
import SavingsGoalFormSheet from '@/features/finance/components/SavingsGoalFormSheet';
import {
  useContributeSavingsGoal,
  useDeleteSavingsGoal,
  useSavingsGoal,
  useUpdateSavingsGoal,
} from '@/features/finance/hooks/useSavingsGoals';
import type { SavingsGoalCreate } from '@/features/finance/types';
import { daysRemaining, requiredMonthlyContribution } from '@/features/finance/utils/savingsGoalUtils';
import { formatRupiah } from '@/lib/utils';
import { useToastStore } from '@/stores/toast';
import { colors, radius, spacing, textStyles } from '@/theme';

export default function GoalDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: goal, isLoading, isRefetching, refetch } = useSavingsGoal(id);
  const contribute = useContributeSavingsGoal();
  const update = useUpdateSavingsGoal();
  const deleteGoal = useDeleteSavingsGoal();
  const { showToast } = useToastStore();

  const [showContribute, setShowContribute] = useState(false);
  const [showEdit, setShowEdit] = useState(false);

  const handleContribute = useCallback(
    async (amount: number) => {
      try {
        await contribute.mutateAsync({ id, data: { amount } });
        setShowContribute(false);
        showToast(amount > 0 ? 'Berhasil menabung!' : 'Dana berhasil ditarik', 'success');
      } catch {
        showToast('Gagal. Coba lagi.', 'error');
      }
    },
    [contribute, id, showToast],
  );

  const handleUpdate = useCallback(
    async (data: SavingsGoalCreate) => {
      try {
        await update.mutateAsync({ id, data });
        setShowEdit(false);
        showToast('Goal diperbarui', 'success');
      } catch {
        showToast('Gagal memperbarui. Coba lagi.', 'error');
      }
    },
    [update, id, showToast],
  );

  const handleDelete = useCallback(() => {
    Alert.alert('Hapus Goal?', 'Goal ini akan diarsipkan dan tidak bisa dilihat lagi.', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteGoal.mutateAsync(id);
            showToast('Goal dihapus', 'info');
            router.back();
          } catch {
            showToast('Gagal menghapus. Coba lagi.', 'error');
          }
        },
      },
    ]);
  }, [deleteGoal, id, router, showToast]);

  const backButton = (
    <Pressable
      onPress={() => router.back()}
      hitSlop={8}
      style={({ pressed }) => pressed && { opacity: 0.6 }}
    >
      <ChevronLeft size={22} color={colors.text.secondary} strokeWidth={2} />
    </Pressable>
  );

  const editButton = (
    <View style={styles.headerActions}>
      <Pressable
        onPress={() => setShowEdit(true)}
        hitSlop={8}
        style={({ pressed }) => pressed && { opacity: 0.7 }}
      >
        <View style={styles.iconBtn}>
          <Pencil size={16} color={colors.text.secondary} strokeWidth={1.5} />
        </View>
      </Pressable>
      <Pressable
        onPress={handleDelete}
        hitSlop={8}
        style={({ pressed }) => pressed && { opacity: 0.7 }}
      >
        <View style={styles.iconBtn}>
          <Trash2 size={16} color={colors.danger.text} strokeWidth={1.5} />
        </View>
      </Pressable>
    </View>
  );

  if (isLoading) {
    return (
      <Screen>
        <Header title="Goal" left={backButton} />
        <View style={styles.skeletonWrap}>
          <SkeletonCard height={200} />
          <SkeletonCard height={120} />
        </View>
      </Screen>
    );
  }

  if (!goal) {
    return (
      <Screen>
        <Header title="Goal" left={backButton} />
        <View style={styles.centered}>
          <Text style={styles.notFound}>Goal tidak ditemukan</Text>
        </View>
      </Screen>
    );
  }

  const days = daysRemaining(goal.target_date);
  const monthly = requiredMonthlyContribution(
    goal.current_amount,
    goal.target_amount,
    goal.target_date,
  );
  const remaining = goal.target_amount - goal.current_amount;

  return (
    <Screen>
      <Header title={goal.name} left={backButton} right={editButton} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.accent.primary}
          />
        }
      >
        {/* Hero */}
        <View style={styles.hero}>
          <Text style={styles.heroIcon}>{goal.icon ?? '🎯'}</Text>
          <Text style={styles.heroAmount}>{formatRupiah(goal.current_amount)}</Text>
          <Text style={styles.heroTarget}>dari {formatRupiah(goal.target_amount)}</Text>

          {goal.is_completed && (
            <View style={styles.completedBadge}>
              <Text style={styles.completedText}>🎉 Goal Tercapai!</Text>
            </View>
          )}
        </View>

        {/* Progress bar */}
        <View style={styles.progressSection}>
          <View style={styles.barTrack}>
            <View
              style={[
                styles.barFill,
                {
                  width: `${Math.min(goal.progress_pct, 100)}%` as `${number}%`,
                  backgroundColor: goal.is_completed ? colors.success.text : colors.accent.primary,
                },
              ]}
            />
          </View>
          <Text style={styles.pctLabel}>{Math.round(goal.progress_pct)}% tercapai</Text>
        </View>

        {/* Stats */}
        <View style={styles.statsCard}>
          {!goal.is_completed && (
            <StatRow
              label="Sisa"
              value={formatRupiah(Math.max(remaining, 0))}
              valueColor={colors.text.primary}
            />
          )}
          {days !== null && (
            <StatRow
              label="Hari tersisa"
              value={days <= 0 ? 'Sudah lewat' : `${days} hari`}
              valueColor={days < 0 ? colors.warning.text : colors.text.primary}
            />
          )}
          {monthly !== null && (
            <StatRow
              label="Target/bulan"
              value={formatRupiah(monthly)}
              valueColor={colors.accent.text}
            />
          )}
          {goal.target_date && (
            <StatRow label="Target tanggal" value={goal.target_date} />
          )}
        </View>

        {/* Action */}
        {!goal.is_completed && (
          <Button
            label="Tabung / Tarik Dana"
            onPress={() => setShowContribute(true)}
            variant="primary"
            fullWidth
          />
        )}
      </ScrollView>

      <ContributeSheet
        isVisible={showContribute}
        onDismiss={() => setShowContribute(false)}
        onContribute={handleContribute}
        isPending={contribute.isPending}
        goalName={goal.name}
      />

      <SavingsGoalFormSheet
        isVisible={showEdit}
        onDismiss={() => setShowEdit(false)}
        onSave={handleUpdate}
        isPending={update.isPending}
        initialValues={goal}
      />
    </Screen>
  );
}

function StatRow({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <View style={styles.statRow}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, valueColor ? { color: valueColor } : undefined]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  skeletonWrap: { padding: spacing['2xl'], gap: spacing.md },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  notFound: { ...StyleSheet.flatten(textStyles.body), color: colors.text.muted },
  headerActions: { flexDirection: 'row', gap: spacing.sm },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.bg.elevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: spacing['2xl'],
    paddingBottom: 48,
    gap: spacing.lg,
  },
  hero: {
    alignItems: 'center',
    paddingVertical: spacing['3xl'],
    gap: spacing.sm,
  },
  heroIcon: { fontSize: 52 },
  heroAmount: {
    ...StyleSheet.flatten(textStyles.display),
    fontSize: 36,
    fontWeight: '700',
    color: colors.text.primary,
    letterSpacing: -0.5,
  },
  heroTarget: {
    ...StyleSheet.flatten(textStyles.caption),
    fontSize: 14,
    color: colors.text.muted,
  },
  completedBadge: {
    marginTop: spacing.xs,
    backgroundColor: colors.success.bg,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  completedText: {
    ...StyleSheet.flatten(textStyles.caption),
    fontWeight: '700',
    color: colors.success.text,
  },
  progressSection: { gap: spacing.sm },
  barTrack: {
    height: 8,
    borderRadius: radius.full,
    backgroundColor: colors.bg.elevated,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: radius.full,
  },
  pctLabel: {
    ...StyleSheet.flatten(textStyles.caption),
    color: colors.text.muted,
    textAlign: 'right',
    fontWeight: '600',
  },
  statsCard: {
    backgroundColor: colors.bg.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
    padding: spacing.xl,
    gap: spacing.md,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statLabel: {
    ...StyleSheet.flatten(textStyles.caption),
    fontSize: 13,
    color: colors.text.muted,
  },
  statValue: {
    ...StyleSheet.flatten(textStyles.caption),
    fontSize: 13,
    fontWeight: '600',
    color: colors.text.secondary,
  },
});
