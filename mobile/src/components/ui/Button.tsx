import React from "react";
import { ActivityIndicator, Pressable, Text } from "react-native";

type Variant = "primary" | "secondary" | "ghost" | "danger";

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
}

const variantStyles: Record<Variant, { container: string; text: string }> = {
  primary: { container: "bg-accent", text: "text-white font-semibold" },
  secondary: { container: "bg-card border border-border", text: "text-ink font-medium" },
  ghost: { container: "bg-transparent", text: "text-accent font-medium" },
  danger: { container: "bg-danger", text: "text-white font-semibold" },
};

function Button({
  label,
  onPress,
  variant = "primary",
  loading = false,
  disabled = false,
  fullWidth = false,
}: ButtonProps) {
  const styles = variantStyles[variant];
  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      className={`flex-row items-center justify-center rounded-xl px-5 py-3.5 ${styles.container} ${fullWidth ? "w-full" : ""} ${isDisabled ? "opacity-50" : ""}`}
    >
      {loading ? (
        <ActivityIndicator size="small" color={variant === "ghost" ? "#6366f1" : "#fff"} />
      ) : (
        <Text className={`text-base ${styles.text}`}>{label}</Text>
      )}
    </Pressable>
  );
}

export default React.memo(Button);
