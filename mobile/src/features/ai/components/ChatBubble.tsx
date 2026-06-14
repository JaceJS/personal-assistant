import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { colors, radius, spacing, textStyles } from "@/theme";
import type { ChatMessage } from "@/features/finance/utils/chatMessageUtils";

const STATUS_LABELS: Record<string, string> = {
  pending: "Uploading...",
  transcribing: "Transcribing...",
  transcribed: "Reviewing transcript",
  extracting: "Extracting transaction...",
  completed: "Done",
  failed: "Failed",
};

export function ChatBubble({ message }: { message: ChatMessage }) {
  const isProcessing = message.status !== "completed" && message.status !== "failed";

  return (
    <View style={styles.wrap}>
      <View style={styles.bubble}>
        <Text style={styles.typeLabel}>{message.type === "voice" ? "Voice" : "Receipt"}</Text>
        <Text
          style={[
            styles.status,
            message.status === "failed" && styles.statusFailed,
            message.status === "completed" && styles.statusDone,
          ]}
        >
          {STATUS_LABELS[message.status] ?? message.status}
        </Text>
        {message.transcript && message.status === "transcribed" && (
          <Text style={styles.transcript} numberOfLines={3}>
            {message.transcript}
          </Text>
        )}
        {message.extractedData && message.status === "completed" && (
          <Text style={styles.amount}>
            {message.extractedData.currency} {message.extractedData.amount.toLocaleString()}
          </Text>
        )}
        {message.errorMessage && <Text style={styles.error}>{message.errorMessage}</Text>}
        {isProcessing && (
          <ActivityIndicator
            size="small"
            color={colors.accent.primary}
            style={styles.spinner}
          />
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
    borderWidth: 1,
    borderColor: colors.border.default,
    padding: spacing.md,
    maxWidth: "80%",
    gap: spacing.xs,
  },
  typeLabel: {
    ...StyleSheet.flatten(textStyles.overline),
    color: colors.text.muted,
    textTransform: "uppercase",
  },
  status: {
    ...StyleSheet.flatten(textStyles.body),
    color: colors.text.secondary,
  },
  statusFailed: {
    color: colors.danger.text,
  },
  statusDone: {
    color: colors.success?.text ?? colors.accent.primary,
  },
  transcript: {
    ...StyleSheet.flatten(textStyles.body),
    color: colors.text.primary,
    fontStyle: "italic",
  },
  amount: {
    ...StyleSheet.flatten(textStyles.h3),
    color: colors.text.primary,
  },
  error: {
    ...StyleSheet.flatten(textStyles.caption),
    color: colors.danger.text,
  },
  spinner: {
    alignSelf: "flex-start",
    marginTop: spacing.xs,
  },
});
