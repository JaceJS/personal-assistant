import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { colors, radius } from '@/theme';

interface SkeletonCardProps {
  height?: number;
}

interface SkeletonTextProps {
  width?: number | `${number}%`;
  height?: number;
}

function usePulse() {
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    opacity.value = withRepeat(withTiming(0.9, { duration: 600 }), -1, true);
  }, [opacity]);

  return useAnimatedStyle(() => ({ opacity: opacity.value }));
}

export function SkeletonCard({ height = 64 }: SkeletonCardProps) {
  const animStyle = usePulse();
  return (
    <Animated.View
      style={[{ height, borderRadius: radius.lg, backgroundColor: colors.bg.elevated }, animStyle]}
    />
  );
}

export function SkeletonText({ width = '60%', height = 14 }: SkeletonTextProps) {
  const animStyle = usePulse();
  return (
    <Animated.View
      style={[
        { width, height, borderRadius: radius.sm, backgroundColor: colors.bg.elevated },
        animStyle,
      ]}
    />
  );
}

export function SkeletonBalanceCard() {
  const animStyle = usePulse();
  return (
    <Animated.View
      style={[styles.balanceCard, { backgroundColor: colors.bg.elevated }, animStyle]}
    />
  );
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
  balanceCard: {
    marginHorizontal: 24,
    marginTop: 20,
    height: 96,
    borderRadius: radius.lg,
  },
  list: { gap: 8 },
});
