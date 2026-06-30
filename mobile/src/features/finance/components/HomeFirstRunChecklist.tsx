import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { CheckCircle, Circle, ChevronRight } from "lucide-react-native";

import type { FirstRunState } from "@/features/finance/hooks/useFirstRun";
import { colors, radius, spacing, textStyles } from "@/theme";

interface Props {
  state: Pick<FirstRunState, "hasAccount" | "hasFirstTransaction" | "hasBudget" | "setupStep">;
  onDismiss: () => void;
}

const STEPS = [
  { key: "account", label: "Tambah akun pertama", route: "/(app)/accounts" as const },
  { key: "transaction", label: "Catat transaksi pertama", route: "/(app)/finance/new" as const },
  { key: "budget", label: "Atur budget bulanan", route: "/(app)/finance/budget" as const },
] as const;

export default function HomeFirstRunChecklist({ state, onDismiss }: Props) {
  const router = useRouter();
  const { hasAccount, hasFirstTransaction, hasBudget } = state;

  const doneFlags = [hasAccount, hasFirstTransaction, hasBudget];
  const completedCount = doneFlags.filter(Boolean).length;
  // Endowed progress: minimum 1/3 so first-time users don't see an empty bar
  const progressPct = Math.max(completedCount / 3, 1 / 3);

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Yuk setup akunmu 🚀</Text>
        <Pressable onPress={onDismiss} hitSlop={12}>
          {({ pressed }) => (
            <Text style={[styles.dismiss, pressed && styles.pressed]}>Lewati</Text>
          )}
        </Pressable>
      </View>

      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${Math.round(progressPct * 100)}%` as `${number}%` }]} />
      </View>
      <Text style={styles.progressLabel}>{completedCount} dari 3 selesai</Text>

      <View style={styles.steps}>
        {STEPS.map(({ key, label, route }, i) => {
          const done = doneFlags[i];
          return (
            <Pressable key={key} onPress={() => router.push(route)}>
              {({ pressed }) => (
                <View style={[styles.stepRow, pressed && styles.pressed]}>
                  <View style={styles.stepIcon}>
                    {done ? (
                      <CheckCircle size={20} color={colors.success.text} />
                    ) : (
                      <Circle size={20} color={colors.text.muted} />
                    )}
                  </View>
                  <Text style={[styles.stepLabel, done && styles.stepLabelDone]}>{label}</Text>
                  {!done && <ChevronRight size={16} color={colors.text.muted} />}
                </View>
              )}
            </Pressable>
          );
        })}
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
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  title: {
    ...StyleSheet.flatten(textStyles.h3),
    color: colors.text.primary,
  },
  dismiss: {
    ...StyleSheet.flatten(textStyles.caption),
    color: colors.text.muted,
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
