import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { colors, radius } from '@/theme';

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
            withTiming(target * 0.5, { duration: 350 }),
          ),
          -1,
          true,
        ),
      );
    } else {
      height.value = withTiming(target, { duration: 300 });
    }
  }, [isActive, index, height]);

  return (
    <Animated.View
      style={[
        style,
        {
          width: 4,
          marginHorizontal: 3,
          borderRadius: radius.full,
          backgroundColor: colors.accent.primary,
        },
      ]}
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
    <View style={styles.container}>
      <View style={styles.bars}>
        {Array.from({ length: BAR_COUNT }).map((_, i) => (
          <WaveBar key={i} index={i} isActive={isRecording} />
        ))}
      </View>
      <Text style={styles.label}>
        {isRecording ? 'Recording...' : 'Hold to record'}
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  container: { alignItems: 'center', gap: 8 },
  bars: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
  },
  label: {
    fontSize: 12,
    fontWeight: '400',
    color: colors.text.muted,
  },
});
