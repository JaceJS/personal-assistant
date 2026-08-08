import { useState } from "react";
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { Camera, Mic, RotateCcw } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";

import { formatMoney, formatTime } from "@/lib/format";
import { colors, radius, spacing, textStyles } from "@/theme";
import type { ChatMessage } from "@/features/finance/utils/chatMessageUtils";

import { MessageStatusIcon } from "./MessageStatusIcon";

// Literal key paths (see src/i18n/types.ts) so t() stays type-checked even
// though the status used to index this map is a runtime string.
const STATUS_LABEL_KEYS = {
  uploading: "ai.chatBubble.status.uploading",
  pending: "ai.chatBubble.status.pending",
  transcribing: "ai.chatBubble.status.transcribing",
  transcribed: "ai.chatBubble.status.transcribed",
  extracting: "ai.chatBubble.status.extracting",
  completed: "ai.chatBubble.status.completed",
  failed: "ai.chatBubble.status.failed",
} as const;

function statusLabel(t: TFunction, status: string): string {
  const key = STATUS_LABEL_KEYS[status as keyof typeof STATUS_LABEL_KEYS];
  return key ? t(key) : status;
}

export function ChatBubble({
  message,
  onRetry,
}: {
  message: ChatMessage;
  onRetry?: (message: ChatMessage) => void;
}) {
  const { t } = useTranslation();
  const [hasImageError, setHasImageError] = useState(false);
  const isUploading = message.status === "uploading";
  const isProcessing = message.status !== "completed" && message.status !== "failed";
  const isVoice = message.type === "voice";
  const canRetry = message.status === "failed" && !!message.localUri && !!onRetry;
  const showThumbnail = message.type === "receipt" && !!message.localUri && !hasImageError;
  const sendStatus = isUploading ? "sending" : message.status === "failed" ? "failed" : "sent";

  return (
    <View style={styles.wrap}>
      <View testID="chat-bubble" style={[styles.bubble, isUploading && styles.bubbleUploading]}>
        {showThumbnail && (
          <Image
            testID="receipt-thumbnail"
            source={{ uri: message.localUri }}
            style={styles.thumbnail}
            onError={() => setHasImageError(true)}
          />
        )}
        <Text
          style={[
            styles.status,
            message.status === "failed" && styles.statusFailed,
            message.status === "completed" && styles.statusDone,
          ]}
        >
          {statusLabel(t, message.status)}
        </Text>
        {message.transcript && message.status === "transcribed" && (
          <Text style={styles.transcript} numberOfLines={3}>
            {message.transcript}
          </Text>
        )}
        {message.extractedData &&
          message.extractedData.length === 1 &&
          message.status === "completed" && (
            <Text style={styles.amount}>
              {formatMoney(message.extractedData[0].amount, message.extractedData[0].currency)}
            </Text>
          )}
        {message.extractedData &&
          message.extractedData.length > 1 &&
          message.status === "completed" && (
            <Text style={styles.amount}>
              {t("ai.chatBubble.itemsExtracted", { count: message.extractedData.length })}
            </Text>
          )}
        {message.errorMessage && <Text style={styles.error}>{message.errorMessage}</Text>}
        {isProcessing && (
          <ActivityIndicator size="small" color={colors.accent.primary} style={styles.spinner} />
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
        <View style={styles.typeFooter}>
          <View style={styles.typeFooterLeft}>
            {isVoice ? (
              <Mic size={12} color={colors.text.muted} strokeWidth={1.8} />
            ) : (
              <Camera size={12} color={colors.text.muted} strokeWidth={1.8} />
            )}
            <Text style={styles.typeLabel}>
              {isVoice ? t("ai.chatBubble.typeVoice") : t("ai.chatBubble.typeReceipt")}
            </Text>
          </View>
          <View style={styles.typeFooterRight}>
            <Text style={styles.timestamp}>{formatTime(message.createdAt)}</Text>
            <MessageStatusIcon status={sendStatus} />
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "flex-end",
  },
  bubble: {
    backgroundColor: colors.accent.subtle,
    borderRadius: radius.lg,
    borderBottomRightRadius: radius.sm,
    borderWidth: 1,
    borderColor: `${colors.accent.primary}30`,
    padding: spacing.md,
    maxWidth: "80%",
    gap: spacing.xs,
  },
  bubbleUploading: {
    opacity: 0.6,
  },
  thumbnail: {
    width: 160,
    height: 160,
    borderRadius: radius.md,
    backgroundColor: colors.bg.surface,
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
    backgroundColor: colors.bg.surface,
  },
  retryLabel: {
    ...StyleSheet.flatten(textStyles.caption),
    color: colors.accent.primary,
  },
  typeFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.xs,
  },
  typeFooterLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  typeLabel: {
    ...StyleSheet.flatten(textStyles.caption),
    color: colors.text.muted,
  },
  typeFooterRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  timestamp: {
    ...StyleSheet.flatten(textStyles.caption),
    color: colors.text.muted,
  },
});
