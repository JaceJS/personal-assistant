import React, { useEffect } from "react";
import { Pressable, View } from "react-native";
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { Mic, Square } from "lucide-react-native";

const RING_DURATION = 1400;

interface Props {
  isRecording: boolean;
  isProcessing: boolean;
  onPressIn: () => void;
  onPressOut: () => void;
}

function PulseRing({ delay, isActive }: { delay: number; isActive: boolean }) {
  const progress = useSharedValue(0);

  const style = useAnimatedStyle(() => ({
    opacity: (1 - progress.value) * 0.5,
    transform: [{ scale: 1 + progress.value * 1.2 }],
  }));

  useEffect(() => {
    if (isActive) {
      progress.value = withDelay(
        delay,
        withRepeat(withTiming(1, { duration: RING_DURATION }), -1, false)
      );
    } else {
      cancelAnimation(progress);
      progress.value = withTiming(0, { duration: 300 });
    }
  }, [isActive, delay, progress]);

  return (
    <Animated.View
      style={style}
      className="absolute h-20 w-20 rounded-full bg-accent"
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
    <View className="items-center justify-center" style={{ width: 140, height: 140 }}>
      <PulseRing delay={0} isActive={isRecording} />
      <PulseRing delay={400} isActive={isRecording} />
      <PulseRing delay={800} isActive={isRecording} />

      <Animated.View style={buttonStyle}>
        <Pressable
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          disabled={isProcessing}
          className={[
            "h-20 w-20 items-center justify-center rounded-full",
            isRecording ? "bg-danger" : "bg-accent",
            isProcessing ? "opacity-60" : "opacity-100",
          ].join(" ")}
        >
          {isRecording ? (
            <Square size={28} color="white" fill="white" />
          ) : (
            <Mic size={32} color="white" />
          )}
        </Pressable>
      </Animated.View>
    </View>
  );
});
