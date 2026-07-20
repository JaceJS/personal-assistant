import { Pressable, StyleSheet, Text, View } from "react-native";
import { RotateCcw } from "lucide-react-native";
import { useTranslation } from "react-i18next";

import { colors, radius, spacing, textStyles } from "@/theme";
import type { AIMessage } from "@/features/finance/utils/chatMessageUtils";

import { TypingIndicator } from "./TypingIndicator";
import { TypewriterText } from "./TypewriterText";

export function AIBubble({
  message,
  onRetry,
  onLongPress,
}: {
  message: AIMessage;
  onRetry?: (message: AIMessage) => void;
  onLongPress?: (message: AIMessage, x: number, y: number) => void;
}) {
  const { t } = useTranslation();
  const canRetry = !!message.failed && !!onRetry;

  return (
    <Pressable
      testID="ai-bubble"
      onLongPress={
        onLongPress
          ? (e) => onLongPress(message, e.nativeEvent.pageX, e.nativeEvent.pageY)
          : undefined
      }
      delayLongPress={350}
    >
      <View style={styles.wrap}>
        <View style={styles.bubble}>
          {message.isTyping && !message.content ? (
            <TypingIndicator />
          ) : (
            <TypewriterText text={message.content ?? ""} animate={!message.skipTypewriter} />
          )}
          {canRetry && (
            <Pressable
              onPress={() => onRetry!(message)}
              style={({ pressed }) => [styles.retryBtn, pressed && { opacity: 0.7 }]}
              hitSlop={6}
            >
              <RotateCcw size={13} color={colors.accent.primary} strokeWidth={2} />
              <Text style={styles.retryLabel}>{t("common.retry")}</Text>
            </Pressable>
          )}
        </View>
      </View>
    </Pressable>
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
    gap: spacing.xs,
  },
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    marginTop: spacing.xs,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: `${colors.accent.primary}40`,
    backgroundColor: colors.bg.elevated,
  },
  retryLabel: {
    ...StyleSheet.flatten(textStyles.caption),
    color: colors.accent.primary,
  },
});
