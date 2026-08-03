import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, radius, spacing, textStyles } from "@/theme";

interface CopiedHintProps {
  visible: boolean;
  label: string;
}

export function CopiedHint({ visible, label }: CopiedHintProps) {
  const insets = useSafeAreaInsets();

  if (!visible) return null;

  return (
    <View pointerEvents="none" style={[styles.pill, { top: insets.top + 8 }]}>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    position: "absolute",
    alignSelf: "center",
    zIndex: 999,
    backgroundColor: colors.bg.elevated,
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 6,
  },
  label: {
    ...StyleSheet.flatten(textStyles.caption),
    color: colors.text.primary,
  },
});
