import React, { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

interface SkeletonCardProps {
  height?: number;
}

interface SkeletonTextProps {
  width?: number | `${number}%`;
  height?: number;
}

function usePulse() {
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withRepeat(withTiming(0.8, { duration: 600 }), -1, true);
  }, [opacity]);

  return useAnimatedStyle(() => ({ opacity: opacity.value }));
}

export function SkeletonCard({ height = 64 }: SkeletonCardProps) {
  const animStyle = usePulse();
  return (
    <Animated.View
      style={[{ height, borderRadius: 12 }, animStyle]}
      className="w-full bg-card"
    />
  );
}

export function SkeletonText({ width = "60%", height = 14 }: SkeletonTextProps) {
  const animStyle = usePulse();
  return (
    <Animated.View
      style={[{ width, height, borderRadius: 6 }, animStyle]}
      className="bg-card"
    />
  );
}

export function SkeletonBalanceCard() {
  const animStyle = usePulse();
  return (
    <Animated.View style={[{ borderRadius: 16 }, animStyle]} className="mx-6 mt-5 h-24 bg-card" />
  );
}

export function SkeletonList({ count = 5 }: { count?: number }) {
  return (
    <View className="gap-2">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} height={60} />
      ))}
    </View>
  );
}
