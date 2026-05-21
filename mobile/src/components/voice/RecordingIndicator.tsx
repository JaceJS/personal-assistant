import React, { useEffect } from "react";
import { Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

const BAR_COUNT = 5;
const BAR_HEIGHTS = [14, 22, 32, 22, 14];

interface BarProps {
  index: number;
  isActive: boolean;
}

function WaveBar({ index, isActive }: BarProps) {
  const height = useSharedValue(BAR_HEIGHTS[index]);

  const style = useAnimatedStyle(() => ({
    height: height.value,
  }));

  useEffect(() => {
    const target = BAR_HEIGHTS[index] ?? 14;
    if (isActive) {
      height.value = withDelay(
        index * 80,
        withRepeat(
          withSequence(
            withTiming(target * 2, { duration: 350 }),
            withTiming(target * 0.5, { duration: 350 })
          ),
          -1,
          true
        )
      );
    } else {
      height.value = withTiming(target, { duration: 300 });
    }
  }, [isActive, index, height]);

  return (
    <Animated.View
      style={style}
      className="mx-0.5 w-1.5 rounded-full bg-accent"
    />
  );
}

interface Props {
  isRecording: boolean;
}

export const RecordingIndicator = React.memo(function RecordingIndicator({
  isRecording,
}: Props) {
  return (
    <View className="items-center gap-2">
      <View className="h-10 flex-row items-center">
        {Array.from({ length: BAR_COUNT }).map((_, i) => (
          <WaveBar key={i} index={i} isActive={isRecording} />
        ))}
      </View>
      {isRecording ? (
        <Text className="font-medium text-sm text-danger">Sedang merekam...</Text>
      ) : (
        <Text className="font-medium text-sm text-muted">Tahan untuk merekam</Text>
      )}
    </View>
  );
});
