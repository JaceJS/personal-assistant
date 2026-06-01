import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radius, textStyles } from "@/theme";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "warning";

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
}

function Button({
  label,
  onPress,
  variant = "primary",
  loading = false,
  disabled = false,
  fullWidth = false,
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        fullWidth && styles.fullWidth,
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
      ]}
    >
      <View style={[styles.base, styles[variant]]}>
        {loading ? (
          <ActivityIndicator
            size="small"
            color={
              variant === "primary"
                ? "#FFFFFF"
                : variant === "warning"
                  ? colors.warning.text
                  : variant === "danger"
                    ? colors.danger.text
                    : colors.accent.primary
            }
          />
        ) : (
          <Text style={[styles.label, styles[`${variant}Label`]]}>{label}</Text>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.md,
    paddingHorizontal: 20,
    paddingVertical: 13,
    minHeight: 44,
  },
  fullWidth: { width: "100%" },
  disabled: { opacity: 0.4 },
  pressed: { opacity: 0.8 },

  primary: { backgroundColor: colors.accent.primary },
  secondary: {
    backgroundColor: colors.bg.elevated,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  ghost: { backgroundColor: "transparent" },
  danger: {
    backgroundColor: colors.danger.bg,
    borderWidth: 1,
    borderColor: `${colors.danger.text}4D`,
  },
  warning: {
    backgroundColor: colors.warning.bg,
    borderWidth: 1,
    borderColor: `${colors.warning.text}4D`,
  },

  label: { ...StyleSheet.flatten(textStyles.h3) },
  primaryLabel: { color: "#FFFFFF" },
  secondaryLabel: { color: colors.text.primary },
  ghostLabel: { color: colors.accent.primary },
  dangerLabel: { color: colors.danger.text },
  warningLabel: { color: colors.warning.text },
});

export default React.memo(Button);
