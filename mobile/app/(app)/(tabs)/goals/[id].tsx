import { useCallback, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pencil, Trash2 } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

import { Header } from '@/components/layout/Header';
import { Screen } from '@/components/layout/Screen';
import { HeaderActions, HeaderButton } from '@/components/ui/HeaderButton';
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
import { formatMoney } from '@/lib/format';
import { useToastStore } from '@/stores/toast';
import { colors, radius, spacing, textStyles } from '@/theme';
import { TAB_BAR_CLEARANCE } from '@/components/ui/FloatingTabBar';

export default function GoalDetailScreen() {
  const router = useRouter();
  const { t } = useTranslation();
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
        showToast(
          amount > 0 ? t('goals.contribute.savingSuccess') : t('goals.contribute.withdrawSuccess'),
          'success',
        );
      } catch {
        showToast(t('goals.contribute.error'), 'error');
      }
    },
    [contribute, id, showToast, t],
  );

  const handleUpdate = useCallback(
    async (data: SavingsGoalCreate) => {
      try {
        await update.mutateAsync({ id, data });
        setShowEdit(false);
        showToast(t('goals.detail.updatedToast'), 'success');
      } catch {
        showToast(t('goals.detail.updateError'), 'error');
      }
    },
    [update, id, showToast, t],
  );

  const handleDelete = useCallback(() => {
    Alert.alert(
      t('goals.detail.deleteAlertTitle'),
      t('goals.detail.deleteAlertMessage', { name: goal?.name }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteGoal.mutateAsync(id);
              showToast(t('goals.detail.deletedToast'), 'info');
              router.back();
            } catch {
              showToast(t('goals.detail.deleteError'), 'error');
            }
          },
        },
      ],
    );
  }, [deleteGoal, goal, id, router, showToast, t]);

  const editButton = (
    <HeaderActions>
      <HeaderButton icon={Pencil} onPress={() => setShowEdit(true)} variant="warning" />
      <HeaderButton icon={Trash2} onPress={handleDelete} variant="danger" />
    </HeaderActions>
  );

  if (isLoading) {
    return (
      <Screen>
        <Header title={t('goals.detail.fallbackTitle')} onBack={() => router.back()} />
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
        <Header title={t('goals.detail.fallbackTitle')} onBack={() => router.back()} />
        <View style={styles.centered}>
          <Text style={styles.notFound}>{t('goals.detail.notFound')}</Text>
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
      <Header title={goal.name} onBack={() => router.back()} right={editButton} />

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
          <Text style={styles.heroAmount}>{formatMoney(goal.current_amount)}</Text>
          <Text style={styles.heroTarget}>
            {t('goals.detail.ofTarget', { amount: formatMoney(goal.target_amount) })}
          </Text>

          {goal.is_completed && (
            <View style={styles.completedBadge}>
              <Text style={styles.completedText}>{t('goals.detail.completedBadge')}</Text>
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
          <Text style={styles.pctLabel}>
            {t('goals.detail.progressLabel', { pct: Math.round(goal.progress_pct) })}
          </Text>
        </View>

        {/* Stats */}
        <View style={styles.statsCard}>
          {!goal.is_completed && (
            <StatRow
              label={t('goals.detail.remainingLabel')}
              value={formatMoney(Math.max(remaining, 0))}
              valueColor={colors.text.primary}
            />
          )}
          {days !== null && (
            <StatRow
              label={t('goals.detail.daysLeftLabel')}
              value={days <= 0 ? t('goals.detail.daysOverdue') : t('goals.detail.daysCount', { count: days })}
              valueColor={days < 0 ? colors.warning.text : colors.text.primary}
            />
          )}
          {monthly !== null && (
            <StatRow
              label={t('goals.detail.perMonthLabel')}
              value={formatMoney(monthly)}
              valueColor={colors.accent.text}
            />
          )}
          {goal.target_date && (
            <StatRow label={t('goals.detail.targetDateLabel')} value={goal.target_date} />
          )}
        </View>

        {/* Action */}
        {!goal.is_completed && (
          <Button
            label={t('goals.detail.contributeCta')}
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
    paddingBottom: TAB_BAR_CLEARANCE,
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
