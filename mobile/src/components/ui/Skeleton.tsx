import React, { useCallback, useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import type { LayoutChangeEvent, StyleProp, ViewStyle } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import { colors, radius } from "@/theme";

const SKELETON_FILL_COLOR = colors.border.default;
const SHIMMER_DURATION_MS = 1400;
const SHIMMER_WIDTH_RATIO = 0.5;

interface SkeletonCardProps {
  height?: number;
}

interface SkeletonTextProps {
  width?: number | `${number}%`;
  height?: number;
}

function useShimmerTranslateX(containerWidth: number) {
  const translateX = useSharedValue(-containerWidth);

  useEffect(() => {
    if (containerWidth <= 0) return;
    translateX.value = -containerWidth * SHIMMER_WIDTH_RATIO;
    translateX.value = withRepeat(
      withTiming(containerWidth, { duration: SHIMMER_DURATION_MS, easing: Easing.linear }),
      -1,
      false
    );
  }, [containerWidth, translateX]);

  return useAnimatedStyle(() => ({ transform: [{ translateX: translateX.value }] }));
}

function Shimmer({ containerWidth }: { containerWidth: number }) {
  const animStyle = useShimmerTranslateX(containerWidth);
  if (containerWidth <= 0) return null;
  const shimmerWidth = containerWidth * SHIMMER_WIDTH_RATIO;

  return (
    <Animated.View style={[styles.shimmer, { width: shimmerWidth }, animStyle]}>
      <Svg width="100%" height="100%">
        <Defs>
          <LinearGradient id="shimmerGradient" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0} />
            <Stop offset="0.5" stopColor="#FFFFFF" stopOpacity={0.4} />
            <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#shimmerGradient)" />
      </Svg>
    </Animated.View>
  );
}

interface SkeletonBaseProps {
  style: StyleProp<ViewStyle>;
}

export function SkeletonBase({ style }: SkeletonBaseProps) {
  const [width, setWidth] = useState(0);
  const onLayout = useCallback((e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width), []);

  return (
    <View style={[style, styles.base]} onLayout={onLayout}>
      <Shimmer containerWidth={width} />
    </View>
  );
}

export function SkeletonCard({ height = 64 }: SkeletonCardProps) {
  return <SkeletonBase style={{ height, borderRadius: radius.lg }} />;
}

export function SkeletonText({ width = "60%", height = 14 }: SkeletonTextProps) {
  return <SkeletonBase style={{ width, height, borderRadius: radius.sm }} />;
}

export function SkeletonBalanceCard() {
  return <SkeletonBase style={styles.balanceCard} />;
}

export function SkeletonList({ count = 5 }: { count?: number }) {
  return (
    <View style={styles.list}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} height={60} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: SKELETON_FILL_COLOR,
    overflow: "hidden",
  },
  shimmer: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
  },
  balanceCard: {
    height: 96,
    borderRadius: radius.lg,
  },
  list: { gap: 8 },
});
