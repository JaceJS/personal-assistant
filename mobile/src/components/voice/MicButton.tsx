import React, { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { Mic, Square } from 'lucide-react-native';
import { colors, radius } from '@/theme';

const RING_DURATION = 1400;
const BUTTON_SIZE = 72;

interface Props {
  isRecording: boolean;
  isProcessing: boolean;
  onPressIn: () => void;
  onPressOut: () => void;
}

function PulseRing({ delay, isActive }: { delay: number; isActive: boolean }) {
  const progress = useSharedValue(0);

  const style = useAnimatedStyle(() => ({
    opacity: (1 - progress.value) * 0.35,
    transform: [{ scale: 1 + progress.value * 1.4 }],
  }));

  useEffect(() => {
    if (isActive) {
      progress.value = withDelay(
        delay,
        withRepeat(withTiming(1, { duration: RING_DURATION }), -1, false),
      );
    } else {
      cancelAnimation(progress);
      progress.value = withTiming(0, { duration: 300 });
    }
  }, [isActive, delay, progress]);

  return (
    <Animated.View
      style={[style, styles.ring, { backgroundColor: colors.accent.primary }]}
    />
  );
}

export const MicButton = React.memo(function MicButton({
  isRecording,
  isProcessing,
  onPressIn,
  onPressOut,
}: Props) {
  const scale = useSharedValue(1);

  const buttonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withTiming(0.93, { duration: 100 });
    onPressIn();
  };

  const handlePressOut = () => {
    scale.value = withTiming(1, { duration: 150 });
    onPressOut();
  };

  return (
    <View style={styles.container}>
      <PulseRing delay={0} isActive={isRecording} />
      <PulseRing delay={400} isActive={isRecording} />
      <PulseRing delay={800} isActive={isRecording} />

      <Animated.View style={buttonStyle}>
        <Pressable
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          disabled={isProcessing}
          style={[
            styles.button,
            isRecording ? styles.buttonRecording : styles.buttonIdle,
            isProcessing && styles.buttonDisabled,
          ]}
        >
          {isRecording ? (
            <Square size={26} color={colors.danger.text} fill={colors.danger.text} />
          ) : (
            <Mic size={30} color={colors.bg.canvas} />
          )}
        </Pressable>
      </Animated.View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    width: 140,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: radius.full,
  },
  button: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonIdle: {
    backgroundColor: colors.accent.primary,
  },
  buttonRecording: {
    backgroundColor: colors.danger.bg,
    borderWidth: 1.5,
    borderColor: `${colors.danger.text}80`,
  },
  buttonDisabled: { opacity: 0.5 },
});
