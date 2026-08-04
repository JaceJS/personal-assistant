import React, { useEffect } from "react";
import { Pressable, Text } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AlertTriangle, CheckCircle, Info, XCircle } from "lucide-react-native";
import { useToastStore } from "@/stores/toast";
import type { ToastType } from "@/stores/toast";

const CONFIG: Record<ToastType, { bg: string; icon: React.ReactNode }> = {
  success: { bg: "#74BD73", icon: <CheckCircle size={18} color="#fff" /> },
  error: { bg: "#C9694F", icon: <XCircle size={18} color="#fff" /> },
  info: { bg: "#9DC3CE", icon: <Info size={18} color="#0F0F0F" /> },
  warning: { bg: "#D9A94E", icon: <AlertTriangle size={18} color="#0F0F0F" /> },
};

// The toast drops in from the top, so only an upward drag dismisses it —
// either far enough or fast enough counts, matching how iOS/Android
// notification banners behave.
const SWIPE_UP_DISTANCE_THRESHOLD = -40;
const SWIPE_UP_VELOCITY_THRESHOLD = -500;

export function Toast() {
  const { message, type, visible, hideToast } = useToastStore();
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(-100);
  const dragY = useSharedValue(0);

  useEffect(() => {
    translateY.value = withSpring(visible ? 0 : -100, {
      damping: 18,
      stiffness: 200,
    });
    dragY.value = 0;
  }, [visible, translateY, dragY]);

  const panGesture = Gesture.Pan()
    .activeOffsetY(-10)
    .onUpdate((e) => {
      // Only follow the finger upward (off-screen direction) — a downward
      // drag has nowhere to go and would just look broken.
      dragY.value = Math.min(e.translationY, 0);
    })
    .onEnd((e) => {
      const draggedFarEnough = dragY.value < SWIPE_UP_DISTANCE_THRESHOLD;
      const flickedFastEnough = e.velocityY < SWIPE_UP_VELOCITY_THRESHOLD;
      if (draggedFarEnough || flickedFastEnough) {
        runOnJS(hideToast)();
      } else {
        dragY.value = withSpring(0, { damping: 18, stiffness: 200 });
      }
    });

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value + dragY.value }],
  }));

  const cfg = CONFIG[type];

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View
        style={[
          {
            position: "absolute",
            top: insets.top + 8,
            left: 16,
            right: 16,
            zIndex: 999,
            backgroundColor: cfg.bg,
            borderRadius: 14,
            paddingHorizontal: 16,
            paddingVertical: 12,
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.15,
            shadowRadius: 8,
            elevation: 8,
          },
          animStyle,
        ]}
      >
        {cfg.icon}
        <Text style={{ flex: 1, color: "#fff", fontSize: 14 }}>
          {message}
        </Text>
        <Pressable onPress={hideToast} hitSlop={8}>
          <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 18, lineHeight: 18 }}>✕</Text>
        </Pressable>
      </Animated.View>
    </GestureDetector>
  );
}
