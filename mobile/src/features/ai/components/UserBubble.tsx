import { StyleSheet, Text, View } from "react-native";

import { colors, radius, spacing, textStyles } from "@/theme";
import type { UserTextMessage } from "@/features/finance/utils/chatMessageUtils";

export function UserBubble({ message }: { message: UserTextMessage }) {
  return (
    <View style={styles.wrap}>
      <View style={styles.bubble}>
        <Text style={styles.text}>{message.content}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "flex-end",
  },
  bubble: {
    backgroundColor: colors.accent.primary,
    borderRadius: radius.lg,
    borderBottomRightRadius: radius.sm,
    padding: spacing.md,
    maxWidth: "80%",
  },
  text: {
    ...StyleSheet.flatten(textStyles.body),
    color: "#FFFFFF",
  },
});
