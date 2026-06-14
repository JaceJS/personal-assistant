import { StyleSheet, View } from "react-native";

import { colors, radius, spacing } from "@/theme";
import type { AIMessage } from "@/features/finance/utils/chatMessageUtils";

import { TypingIndicator } from "./TypingIndicator";
import { TypewriterText } from "./TypewriterText";

export function AIBubble({ message }: { message: AIMessage }) {
  return (
    <View style={styles.wrap}>
      <View style={styles.bubble}>
        {message.isTyping && !message.content ? (
          <TypingIndicator />
        ) : (
          <TypewriterText text={message.content ?? ""} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "flex-start",
  },
  bubble: {
    backgroundColor: colors.bg.surface,
    borderRadius: radius.lg,
    borderBottomLeftRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border.default,
    padding: spacing.md,
    maxWidth: "80%",
  },
});
