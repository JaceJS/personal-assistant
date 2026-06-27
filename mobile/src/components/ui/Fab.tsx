import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { LucideIcon } from "lucide-react-native";
import { colors, radius } from "@/theme";

const FAB_SIZE = 56;
const TAB_BAR_CLEARANCE = 90; // FloatingTabBar height (~67) + breathing room

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
      style={[styles.pressable, { bottom: insets.bottom + TAB_BAR_CLEARANCE }]}
    >
      {({ pressed }) => (
        <View style={[styles.fab, { opacity: pressed ? 0.85 : 1 }]}>
          <Icon size={24} color={colors.bg.elevated} strokeWidth={2.5} />
        </View>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  pressable: {
    position: "absolute",
    right: 20,
    width: FAB_SIZE,
    height: FAB_SIZE,
    zIndex: 99,
  },
  fab: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: radius.full,
    backgroundColor: colors.accent.primary,
    justifyContent: "center",
    alignItems: "center",

    shadowColor: colors.accent.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 16,

    elevation: 6,
  },
});

export default React.memo(Fab);
