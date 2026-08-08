import { StyleSheet, Text, View } from "react-native";

import { formatChatDaySeparator } from "@/lib/format";
import { colors, radius, spacing, textStyles } from "@/theme";

export function DateSeparator({ date }: { date: Date }) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{formatChatDaySeparator(date)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    marginVertical: spacing.sm,
  },
  label: {
    ...StyleSheet.flatten(textStyles.caption),
    color: colors.text.muted,
    backgroundColor: colors.bg.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
});
