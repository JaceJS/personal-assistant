import React, { useEffect } from "react";
import { Pressable, Text } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AlertTriangle, CheckCircle, Info, XCircle } from "lucide-react-native";
import { useToastStore } from "@/stores/toast";
import type { ToastType } from "@/stores/toast";

const CONFIG: Record<ToastType, { bg: string; icon: React.ReactNode }> = {
  success: { bg: "#7DB87A", icon: <CheckCircle size={18} color="#fff" /> },
  error: { bg: "#C97060", icon: <XCircle size={18} color="#fff" /> },
  info: { bg: "#D4A853", icon: <Info size={18} color="#0F0F0F" /> },
  warning: { bg: "#D4A84B", icon: <AlertTriangle size={18} color="#0F0F0F" /> },
};

export function Toast() {
  const { message, type, visible, hideToast } = useToastStore();
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(-100);

  useEffect(() => {
    translateY.value = withSpring(visible ? 0 : -100, {
      damping: 18,
      stiffness: 200,
    });
  }, [visible, translateY]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const cfg = CONFIG[type];

  return (
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
          shadowOpacity: 0.25,
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
  );
}
