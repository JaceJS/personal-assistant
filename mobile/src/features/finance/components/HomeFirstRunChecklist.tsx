import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { CheckCircle, Circle, ChevronRight } from "lucide-react-native";
import { useTranslation } from "react-i18next";

import { Coachmark, useCoachmarkAnchor } from "@/components/ui/Coachmark";
import type { FirstRunState } from "@/features/finance/hooks/useFirstRun";
import { useActiveCoachmark } from "@/hooks/useActiveCoachmark";
import { useOnboardingStore, type CoachmarkId } from "@/stores/onboarding";
import { colors, radius, spacing, textStyles } from "@/theme";

interface Props {
  state: Pick<FirstRunState, "hasAccount" | "hasFirstTransaction" | "hasBudget" | "setupStep">;
}

const STEPS = [
  {
    key: "account",
    labelKey: "home.accountBalance.promptFirstAccount",
    route: "/(app)/accounts" as const,
    coachmarkId: "homeAccount" as const satisfies CoachmarkId,
    coachmarkTextKey: "coachmark.homeAccountText",
    coachmarkA11yKey: "coachmark.dismissHomeAccountA11y",
  },
  {
    key: "transaction",
    labelKey: "home.accountBalance.promptFirstTransaction",
    route: "/(app)/finance/new" as const,
    coachmarkId: "homeTransaction" as const satisfies CoachmarkId,
    coachmarkTextKey: "coachmark.homeTransactionText",
    coachmarkA11yKey: "coachmark.dismissHomeTransactionA11y",
  },
  {
    key: "budget",
    labelKey: "home.setBudgetCta",
    route: "/(app)/finance/budget" as const,
    coachmarkId: "homeBudget" as const satisfies CoachmarkId,
    coachmarkTextKey: "coachmark.homeBudgetText",
    coachmarkA11yKey: "coachmark.dismissHomeBudgetA11y",
  },
] as const;

export default function HomeFirstRunChecklist({ state }: Props) {
  const router = useRouter();
  const { t } = useTranslation();
  const activeCoachmark = useActiveCoachmark();
  const dismissCoachmark = useOnboardingStore((s) => s.dismissCoachmark);
  const { hasAccount, hasFirstTransaction, hasBudget } = state;
  const stepAnchors = [useCoachmarkAnchor(), useCoachmarkAnchor(), useCoachmarkAnchor()];

  const doneFlags = [hasAccount, hasFirstTransaction, hasBudget];
  const completedCount = doneFlags.filter(Boolean).length;
  const progressPct = completedCount / 3;

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{t("home.firstRunChecklist.title")}</Text>

      <View style={styles.barTrack}>
        <View
          testID="firstRunProgressBarFill"
          style={[styles.barFill, { width: `${Math.round(progressPct * 100)}%` as `${number}%` }]}
        />
      </View>
      <Text style={styles.progressLabel}>
        {t("home.firstRunChecklist.progressLabel", { count: completedCount })}
      </Text>

      <View style={styles.steps}>
        {STEPS.map(
          ({ key, labelKey, route, coachmarkId, coachmarkTextKey, coachmarkA11yKey }, i) => {
            const done = doneFlags[i];
            const anchor = stepAnchors[i];
            return (
              <View key={key} ref={anchor.ref} onLayout={anchor.onLayout}>
                <Pressable onPress={() => router.push(route)}>
                  {({ pressed }) => (
                    <View style={[styles.stepRow, pressed && styles.pressed]}>
                      <View style={styles.stepIcon}>
                        {done ? (
                          <CheckCircle size={20} color={colors.success.text} />
                        ) : (
                          <Circle size={20} color={colors.text.muted} />
                        )}
                      </View>
                      <Text style={[styles.stepLabel, done && styles.stepLabelDone]}>
                        {t(labelKey)}
                      </Text>
                      {!done && <ChevronRight size={16} color={colors.text.muted} />}
                    </View>
                  )}
                </Pressable>
                <Coachmark
                  visible={activeCoachmark === coachmarkId}
                  anchor={anchor.rect}
                  text={t(coachmarkTextKey)}
                  onDismiss={() => void dismissCoachmark(coachmarkId)}
                  dismissA11yLabel={t(coachmarkA11yKey)}
                  gap={32}
                />
              </View>
            );
          }
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bg.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.accent.border,
    marginHorizontal: spacing["2xl"],
    marginBottom: spacing.lg,
    padding: spacing.xl,
  },
  title: {
    ...StyleSheet.flatten(textStyles.h3),
    color: colors.text.primary,
    marginBottom: 14,
  },
  barTrack: {
    height: 6,
    borderRadius: radius.full,
    backgroundColor: colors.bg.elevated,
    overflow: "hidden",
    marginBottom: 6,
  },
  barFill: {
    height: "100%",
    borderRadius: radius.full,
    backgroundColor: colors.accent.primary,
  },
  progressLabel: {
    ...StyleSheet.flatten(textStyles.caption),
    color: colors.text.muted,
    marginBottom: 16,
  },
  steps: {
    gap: 12,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  stepIcon: {
    width: 24,
    alignItems: "center",
  },
  stepLabel: {
    ...StyleSheet.flatten(textStyles.body),
    flex: 1,
    color: colors.text.primary,
  },
  stepLabelDone: {
    color: colors.text.muted,
    textDecorationLine: "line-through",
  },
  pressed: {
    opacity: 0.7,
  },
});
