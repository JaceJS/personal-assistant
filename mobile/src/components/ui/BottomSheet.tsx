import React, { useEffect } from "react";
import { Modal, Platform, Pressable, StyleSheet, View } from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, radius } from "@/theme";

export const DEFAULT_MAX_HEIGHT_PERCENT = 90;
// Leaves headroom for a sheet nested inside another sheet (e.g. SearchableDropdown in ConfirmCard).
export const NESTED_SHEET_MAX_HEIGHT_PERCENT = 80;

interface BottomSheetProps {
  isVisible: boolean;
  onDismiss?: () => void;
  children: React.ReactNode;
  /** Caps sheet height so tall/scrollable content doesn't grow past the screen. Defaults to 90. */
  maxHeightPercent?: number;
}

export function BottomSheet({
  isVisible,
  onDismiss,
  children,
  maxHeightPercent,
}: BottomSheetProps) {
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(600);
  const backdropOpacity = useSharedValue(0);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  useEffect(() => {
    if (isVisible) {
      backdropOpacity.value = withTiming(1, { duration: 250, easing: Easing.out(Easing.cubic) });
      translateY.value = withTiming(0, { duration: 250, easing: Easing.out(Easing.cubic) });
    } else {
      backdropOpacity.value = withTiming(0, { duration: 200, easing: Easing.in(Easing.cubic) });
      translateY.value = withTiming(600, { duration: 200, easing: Easing.in(Easing.cubic) });
    }
  }, [isVisible, translateY, backdropOpacity]);

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onDismiss}
    >
      <Animated.View
        style={[StyleSheet.absoluteFillObject, styles.backdrop, backdropStyle]}
        pointerEvents={isVisible ? "auto" : "none"}
      >
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onDismiss} />
      </Animated.View>

      <Animated.View
        style={[
          styles.sheet,
          sheetStyle,
          { paddingBottom: insets.bottom + 16 },
          { maxHeight: `${maxHeightPercent ?? DEFAULT_MAX_HEIGHT_PERCENT}%` },
        ]}
      >
        <View style={styles.handle} />
        {/* "padding" doesn't reliably push a nested sheet above the keyboard on Android. */}
        <KeyboardAvoidingView
          style={styles.keyboardAvoider}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          {children}
        </KeyboardAvoidingView>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.bg.elevated,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
  },
  handle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: radius.full,
    backgroundColor: colors.border.default,
    marginTop: 12,
    marginBottom: 8,
  },
  keyboardAvoider: {
    flexShrink: 1,
  },
});
