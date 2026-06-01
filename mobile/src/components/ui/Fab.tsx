import React from "react";
import { Pressable, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { LucideIcon } from "lucide-react-native";
import { colors, radius } from "@/theme";

const FAB_SIZE = 56;
const TAB_BAR_CLEARANCE = 80; // FloatingTabBar height (~67) + breathing room

interface FabProps {
  onPress: () => void;
  icon: LucideIcon;
  accessibilityLabel: string;
}

function Fab({ onPress, icon: Icon, accessibilityLabel }: FabProps) {
  const insets = useSafeAreaInsets();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [
        styles.fab,
        { bottom: insets.bottom + TAB_BAR_CLEARANCE },
        pressed && styles.pressed,
      ]}
    >
      <Icon size={24} color={colors.bg.canvas} strokeWidth={2.5} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: "absolute",
    bottom: 80,
    right: 20,
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: radius.full,
    backgroundColor: colors.accent.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 10,
  },
  pressed: { opacity: 0.85 },
});

export default React.memo(Fab);
