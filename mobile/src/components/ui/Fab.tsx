import React from "react";
import { Pressable, StyleSheet, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { LucideIcon } from "lucide-react-native";
import { colors, radius } from "@/theme";
import { Text } from "react-native";

const FAB_SIZE = 56;
const TAB_BAR_CLEARANCE = 80; // FloatingTabBar height (~67) + breathing room

interface FabProps {
  onPress: () => void;
  icon: LucideIcon;
  accessibilityLabel: string;
}

const Fab: React.FC<FabProps> = ({ onPress, icon: Icon, accessibilityLabel }) => {
  const insets = useSafeAreaInsets();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={[styles.fab, { bottom: insets.bottom + TAB_BAR_CLEARANCE }]}
    >
      {({ pressed }) => (
        <Icon
          size={24}
          color={colors.bg.elevated}
          strokeWidth={2.5}
          style={{ opacity: pressed ? 0.85 : 1 }}
        />
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  fab: {
    position: "absolute",
    justifyContent: "center",
    alignItems: "center",
    right: 20,
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: radius.full,
    backgroundColor: colors.accent.primary,

    shadowColor: colors.accent.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 16,

    elevation: 6,
  },
  pressed: { opacity: 0.85 },
});

export default React.memo(Fab);
