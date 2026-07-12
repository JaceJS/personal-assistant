import { useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";

import { formatRecordingDuration } from "@/features/finance/utils/recordingUtils";
import { colors, radius, spacing, textStyles } from "@/theme";

const BAR_COUNT = 5;
const BAR_HEIGHTS = [10, 18, 26, 18, 10];

function WaveBar({ index }: { index: number }) {
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(index * 80),
        Animated.timing(scale, { toValue: 1.8, duration: 350, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 0.5, duration: 350, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1, duration: 200, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [index, scale]);

  return (
    <Animated.View
      style={[styles.bar, { height: BAR_HEIGHTS[index], transform: [{ scaleY: scale }] }]}
    />
  );
}

interface RecordingIndicatorProps {
  durationMs: number;
  onCancel: () => void;
}

export function RecordingIndicator({ durationMs, onCancel }: RecordingIndicatorProps) {
  return (
    <View style={styles.container}>
      <View style={styles.bars}>
        {Array.from({ length: BAR_COUNT }).map((_, i) => (
          <WaveBar key={i} index={i} />
        ))}
      </View>
      <Text style={styles.timer}>{formatRecordingDuration(durationMs)}</Text>
      <Text style={styles.hint}>Lepas untuk kirim</Text>
      <Pressable onPress={onCancel} hitSlop={8}>
        <View style={styles.cancelBtn}>
          <Text style={styles.cancelLabel}>Batal</Text>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.danger.bg,
  },
  bars: {
    height: 32,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  bar: {
    width: 4,
    borderRadius: radius.full,
    backgroundColor: colors.danger.text,
  },
  timer: {
    ...StyleSheet.flatten(textStyles.h3),
    color: colors.danger.text,
    fontVariant: ["tabular-nums"],
  },
  hint: {
    ...StyleSheet.flatten(textStyles.caption),
    color: colors.text.muted,
    flex: 1,
  },
  cancelBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: `${colors.danger.text}80`,
  },
  cancelLabel: {
    ...StyleSheet.flatten(textStyles.caption),
    color: colors.danger.text,
  },
});
