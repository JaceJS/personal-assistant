import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import type { LucideIcon } from "lucide-react-native";
import { colors, radius } from "@/theme";

type HeaderButtonVariant = "primary" | "danger";

interface HeaderButtonProps {
  icon: LucideIcon;
  onPress: () => void;
  variant?: HeaderButtonVariant;
  color?: string;
  iconSize?: number;
  accessibilityLabel?: string;
}

export function HeaderButton({
  icon: Icon,
  onPress,
  variant = "primary",
  color,
  iconSize = 18,
  accessibilityLabel,
}: HeaderButtonProps) {
  const isDanger = variant === "danger";
  const bg = isDanger ? colors.danger.bg : colors.accent.subtle;
  const border = isDanger ? `${colors.danger.text}4D` : colors.accent.border;
  const iconColor = isDanger ? colors.danger.text : (color ?? colors.accent.primary);

  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={accessibilityLabel}
      style={styles.pressable}
      hitSlop={8}
    >
      {({ pressed }) => (
        <View style={[styles.btn, { backgroundColor: bg, borderColor: border }, pressed && styles.pressed]}>
          <Icon size={iconSize} color={iconColor} strokeWidth={2} />
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    alignItems: "center",
    justifyContent: "center",
  },
  btn: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: {
    opacity: 0.7,
  },
});
