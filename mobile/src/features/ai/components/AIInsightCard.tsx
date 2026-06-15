import { StyleSheet, Text, View } from "react-native";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { useAIInsight } from "@/features/ai/hooks/useAIInsight";
import { colors, radius, spacing, textStyles } from "@/theme";

const GLOW_COLOR = colors.accent.primary;
const FALLBACK_TEXT = "Unable to load insight. Keep tracking your expenses!";

export function AIInsightCard() {
  const { data, isLoading, isError } = useAIInsight();

  if (isLoading) {
    return (
      <View testID="ai-insight-skeleton" style={styles.skeletonWrapper}>
        <SkeletonCard height={96} />
      </View>
    );
  }

  if (isError || !data) {
    return (
      <View testID="ai-insight-fallback" style={[styles.card, styles.fallbackCard]}>
        <Text style={styles.fallbackText}>{FALLBACK_TEXT}</Text>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.glowLarge} />
      <View style={styles.glowSmall} />
      <View style={styles.inner}>
        <Text style={styles.label}>AI INSIGHT</Text>
        <Text style={styles.body}>{data.insight}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  skeletonWrapper: {
    marginHorizontal: spacing["2xl"],
    marginBottom: spacing["2xl"],
  },
  card: {
    marginHorizontal: spacing["2xl"],
    marginBottom: spacing["2xl"],
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: `${GLOW_COLOR}4D`,
    backgroundColor: "#13112A",
    overflow: "hidden",
    shadowColor: GLOW_COLOR,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 16,
    elevation: 5,
  },
  fallbackCard: {
    borderColor: colors.border.default,
    backgroundColor: colors.bg.surface,
  },
  glowLarge: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: 70,
    top: -40,
    right: -30,
    backgroundColor: GLOW_COLOR,
    opacity: 0.15,
  },
  glowSmall: {
    position: "absolute",
    width: 70,
    height: 70,
    borderRadius: 35,
    bottom: -20,
    left: -15,
    backgroundColor: GLOW_COLOR,
    opacity: 0.08,
  },
  inner: {
    padding: spacing.lg,
    gap: spacing.xs,
  },
  label: {
    ...StyleSheet.flatten(textStyles.overline),
    fontSize: 10,
    color: colors.accent.primary,
    letterSpacing: 1.2,
  },
  body: {
    ...StyleSheet.flatten(textStyles.body),
    color: colors.text.primary,
    lineHeight: 22,
  },
  fallbackText: {
    ...StyleSheet.flatten(textStyles.caption),
    color: colors.text.muted,
    padding: spacing.lg,
  },
});
