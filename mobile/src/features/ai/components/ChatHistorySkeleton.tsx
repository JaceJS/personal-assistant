import { StyleSheet, View } from "react-native";
import Animated from "react-native-reanimated";

import { usePulse } from "@/components/ui/Skeleton";
import { colors, radius, spacing } from "@/theme";

const ROWS: { align: "left" | "right"; width: `${number}%`; height: number }[] = [
  { align: "left", width: "55%", height: 44 },
  { align: "right", width: "40%", height: 36 },
  { align: "left", width: "68%", height: 60 },
  { align: "left", width: "35%", height: 30 },
  { align: "right", width: "50%", height: 44 },
];

function SkeletonBubble({ align, width, height }: (typeof ROWS)[number]) {
  const animStyle = usePulse();
  return (
    <View style={[styles.row, align === "right" && styles.rowRight]}>
      <Animated.View style={[styles.bubble, { width, height }, animStyle]} />
    </View>
  );
}

export function ChatHistorySkeleton() {
  return (
    <View style={styles.container} testID="chat-history-skeleton">
      {ROWS.map((row, i) => (
        <SkeletonBubble key={i} {...row} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.lg,
    gap: spacing.md,
  },
  row: {
    flexDirection: "row",
  },
  rowRight: {
    justifyContent: "flex-end",
  },
  bubble: {
    borderRadius: radius.lg,
    backgroundColor: colors.bg.elevated,
  },
});
