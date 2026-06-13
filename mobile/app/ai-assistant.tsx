import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { Camera, Mic, SendHorizontal, Square, X } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { Header } from "@/components/layout/Header";
import { ConfirmCard } from "@/components/voice/ConfirmCard";
import type { ConfirmPayload } from "@/components/voice/ConfirmCard";
import { TranscriptSheet } from "@/components/voice/TranscriptSheet";
import { useChat } from "@/features/ai/hooks/useChat";
import { useAccounts } from "@/features/finance/hooks/useAccounts";
import {
  useConfirmReceiptTransaction,
  useReceiptStatus,
  useUploadReceipt,
} from "@/features/finance/hooks/useReceipt";
import {
  useConfirmVoiceTransaction,
  useExtractVoice,
  useUploadAudio,
  useVoiceStatus,
} from "@/features/finance/hooks/useVoice";
import {
  applyReceiptStatus,
  applyVoiceStatus,
  createReceiptMessage,
  createVoiceMessage,
} from "@/features/finance/utils/chatMessageUtils";
import type {
  AIMessage,
  ChatMessage,
  Message,
  UserTextMessage,
} from "@/features/finance/utils/chatMessageUtils";
import { useVoiceRecorder } from "@/hooks/useVoiceRecorder";
import { useToastStore } from "@/stores/toast";
import { colors, radius, spacing, textStyles } from "@/theme";

const PROCESSING_TIMEOUT_MS = 60_000;

export default function AIAssistantScreen() {
  const router = useRouter();
  const showToast = useToastStore((s) => s.showToast);
  const { data: accounts } = useAccounts();
  const { messages, setMessages, sendMessage } = useChat();

  // Voice hooks
  const uploadAudio = useUploadAudio();
  const extractVoice = useExtractVoice();
  const confirmVoiceTransaction = useConfirmVoiceTransaction();
  const {
    isRecording,
    isProcessing: recorderProcessing,
    startRecording,
    stopRecording,
    cancelRecording,
    reset: resetRecorder,
  } = useVoiceRecorder();

  // Receipt hooks
  const uploadReceipt = useUploadReceipt();
  const confirmReceiptTransaction = useConfirmReceiptTransaction();

  // Processing state
  const [voiceLogId, setVoiceLogId] = useState<string | null>(null);
  const [transcriptVisible, setTranscriptVisible] = useState(false);
  const [voiceConfirmVisible, setVoiceConfirmVisible] = useState(false);
  const [receiptLogId, setReceiptLogId] = useState<string | null>(null);
  const [receiptConfirmVisible, setReceiptConfirmVisible] = useState(false);

  const [inputText, setInputText] = useState("");
  const listRef = useRef<FlatList<Message>>(null);

  const voiceStatus = useVoiceStatus(voiceLogId);
  const receiptStatus = useReceiptStatus(receiptLogId);

  const activeAccounts = useMemo(
    () => accounts?.items.filter((a) => !a.is_archived) ?? [],
    [accounts]
  );
  const defaultAccount = activeAccounts[0] ?? null;

  const isMicBusy = recorderProcessing || uploadAudio.isPending;
  const isCameraBusy = uploadReceipt.isPending;

  // Update voice message as status changes
  useEffect(() => {
    if (!voiceLogId || !voiceStatus.data) return;
    setMessages((prev) =>
      prev.map((m) =>
        m.id === voiceLogId ? applyVoiceStatus(m as ChatMessage, voiceStatus.data!) : m
      )
    );
    if (voiceStatus.data.status === "transcribed") {
      resetRecorder();
      setTranscriptVisible(true);
    } else if (voiceStatus.data.status === "completed") {
      resetRecorder();
      setTranscriptVisible(false);
      if (voiceStatus.data.extracted_data && voiceStatus.data.transaction_id) {
        setVoiceConfirmVisible(true);
      } else {
        setVoiceLogId(null);
        showToast("No draft transaction was created.", "error");
      }
    } else if (voiceStatus.data.status === "failed") {
      resetRecorder();
      setVoiceLogId(null);
      showToast(voiceStatus.data.error_message ?? "Voice processing failed.", "error");
    }
  }, [resetRecorder, setMessages, showToast, voiceLogId, voiceStatus.data]);

  // Update receipt message as status changes
  useEffect(() => {
    if (!receiptLogId || !receiptStatus.data) return;
    setMessages((prev) =>
      prev.map((m) =>
        m.id === receiptLogId ? applyReceiptStatus(m as ChatMessage, receiptStatus.data!) : m
      )
    );
    if (receiptStatus.data.status === "completed") {
      if (receiptStatus.data.extracted_data && receiptStatus.data.transaction_id) {
        setReceiptConfirmVisible(true);
      } else {
        setReceiptLogId(null);
        showToast("Could not extract transaction from receipt.", "error");
      }
    } else if (receiptStatus.data.status === "failed") {
      setReceiptLogId(null);
      showToast(receiptStatus.data.error_message ?? "Receipt processing failed.", "error");
    }
  }, [setMessages, showToast, receiptLogId, receiptStatus.data]);

  // Auto-fail voice if worker never responds
  useEffect(() => {
    if (!voiceLogId) return;
    const id = voiceLogId;
    const timer = setTimeout(() => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === id
            ? { ...(m as ChatMessage), status: "failed", errorMessage: "Processing timed out. Please try again." }
            : m
        )
      );
      setVoiceLogId(null);
      setTranscriptVisible(false);
      resetRecorder();
      showToast("Voice processing timed out.", "error");
    }, PROCESSING_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [voiceLogId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-fail receipt if worker never responds
  useEffect(() => {
    if (!receiptLogId) return;
    const id = receiptLogId;
    const timer = setTimeout(() => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === id
            ? { ...(m as ChatMessage), status: "failed", errorMessage: "Processing timed out. Please try again." }
            : m
        )
      );
      setReceiptLogId(null);
      showToast("Receipt processing timed out.", "error");
    }, PROCESSING_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [receiptLogId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSendText = useCallback(() => {
    const text = inputText.trim();
    if (!text) return;
    setInputText("");
    void sendMessage(text);
  }, [inputText, sendMessage]);

  const handleMicPressIn = useCallback(() => {
    if (isMicBusy || isRecording) return;
    if (!defaultAccount) {
      showToast("Create an account before recording a transaction.", "error");
      return;
    }
    void startRecording();
  }, [defaultAccount, isMicBusy, isRecording, showToast, startRecording]);

  const handleMicPressOut = useCallback(() => {
    if (!isRecording || !defaultAccount) return;
    void (async () => {
      const audioUri = await stopRecording();
      if (!audioUri) return;
      try {
        const response = await uploadAudio.mutateAsync({
          audioUri,
          accountId: defaultAccount.id,
        });
        const msg = createVoiceMessage(response.voice_log_id);
        setMessages((prev) => [...prev, msg]);
        setVoiceLogId(response.voice_log_id);
      } catch {
        resetRecorder();
        showToast("Could not upload voice recording.", "error");
      }
    })();
  }, [defaultAccount, isRecording, resetRecorder, setMessages, showToast, stopRecording, uploadAudio]);

  const handleCameraPress = useCallback(async () => {
    if (!defaultAccount) {
      showToast("Create an account before scanning a receipt.", "error");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      quality: 0.8,
      allowsEditing: false,
    });
    if (result.canceled || !result.assets[0]) return;
    const imageUri = result.assets[0].uri;
    try {
      const response = await uploadReceipt.mutateAsync({
        imageUri,
        accountId: defaultAccount.id,
      });
      const msg = createReceiptMessage(response.receipt_log_id);
      setMessages((prev) => [...prev, msg]);
      setReceiptLogId(response.receipt_log_id);
    } catch {
      showToast("Could not upload receipt.", "error");
    }
  }, [defaultAccount, setMessages, showToast, uploadReceipt]);

  const handleTranscriptProcess = useCallback(
    (transcript: string) => {
      if (!voiceLogId) return;
      setTranscriptVisible(false);
      void extractVoice.mutateAsync({ voiceLogId, transcript }).catch(
        () => showToast("Could not start extraction.", "error")
      );
    },
    [extractVoice, showToast, voiceLogId]
  );

  const handleTranscriptDismiss = useCallback(() => {
    setTranscriptVisible(false);
    setVoiceLogId(null);
    setMessages((prev) => prev.filter((m) => m.id !== voiceLogId));
    resetRecorder();
  }, [resetRecorder, setMessages, voiceLogId]);

  const handleVoiceConfirm = useCallback(
    (payload: ConfirmPayload) => {
      const transactionId = voiceStatus.data?.transaction_id;
      if (!transactionId) return;
      setVoiceConfirmVisible(false);
      setVoiceLogId(null);
      resetRecorder();
      showToast("Transaction saved.", "success");
      void confirmVoiceTransaction.mutateAsync({ transactionId, ...payload }).catch(
        () => showToast("Could not save transaction.", "error")
      );
    },
    [confirmVoiceTransaction, resetRecorder, showToast, voiceStatus.data?.transaction_id]
  );

  const handleVoiceConfirmDismiss = useCallback(() => {
    setVoiceConfirmVisible(false);
    setVoiceLogId(null);
    resetRecorder();
  }, [resetRecorder]);

  const handleReceiptConfirm = useCallback(
    (payload: ConfirmPayload) => {
      const transactionId = receiptStatus.data?.transaction_id;
      if (!transactionId) return;
      setReceiptConfirmVisible(false);
      setReceiptLogId(null);
      showToast("Transaction saved.", "success");
      void confirmReceiptTransaction.mutateAsync({ transactionId, ...payload }).catch(
        () => showToast("Could not save transaction.", "error")
      );
    },
    [confirmReceiptTransaction, showToast, receiptStatus.data?.transaction_id]
  );

  const handleReceiptConfirmDismiss = useCallback(() => {
    setReceiptConfirmVisible(false);
    setReceiptLogId(null);
  }, []);

  const renderMessage = useCallback(({ item }: { item: Message }) => {
    if (item.type === "user") return <UserBubble message={item} />;
    if (item.type === "ai") return <AIBubble message={item} />;
    return <ChatBubble message={item as ChatMessage} />;
  }, []);

  const isSendMode = inputText.length > 0;

  return (
    <SafeAreaView style={styles.screen} edges={["top", "left", "right"]}>
      <Header
        title="AI Assistant"
        left={
          <Pressable
            onPress={() => router.back()}
            hitSlop={8}
            style={({ pressed }) => pressed && { opacity: 0.6 }}
          >
            <X size={22} color={colors.text.muted} strokeWidth={2} />
          </Pressable>
        }
      />

      {/* Chat area */}
      {messages.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>How can I help?</Text>
          <Text style={styles.emptySubtitle}>
            Type a message, record your voice, or scan a receipt.
          </Text>
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.messageList}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        />
      )}

      {/* Input bar */}
      <View style={styles.inputBar}>
        <Pressable
          onPress={() => void handleCameraPress()}
          disabled={isCameraBusy}
          style={[styles.inputBtn, isCameraBusy && styles.inputBtnDisabled]}
          hitSlop={8}
        >
          {isCameraBusy ? (
            <ActivityIndicator size="small" color={colors.accent.primary} />
          ) : (
            <Camera size={22} color={colors.accent.primary} strokeWidth={1.8} />
          )}
        </Pressable>

        <TextInput
          style={styles.textInput}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Message..."
          placeholderTextColor={colors.text.muted}
          returnKeyType="send"
          onSubmitEditing={handleSendText}
          blurOnSubmit={false}
        />

        <Pressable
          onPressIn={isSendMode ? undefined : handleMicPressIn}
          onPressOut={isSendMode ? undefined : handleMicPressOut}
          onPress={isSendMode ? handleSendText : undefined}
          onLongPress={isSendMode ? undefined : () => void cancelRecording()}
          delayLongPress={1500}
          disabled={!isSendMode && isMicBusy && !isRecording}
          style={[styles.micBtn, isRecording && styles.micBtnRecording]}
          hitSlop={8}
        >
          {isMicBusy && !isRecording && !isSendMode ? (
            <ActivityIndicator color={colors.accent.primary} />
          ) : isRecording ? (
            <Square size={22} color={colors.danger.text} fill={colors.danger.text} />
          ) : isSendMode ? (
            <SendHorizontal size={22} color={colors.accent.primary} strokeWidth={2} />
          ) : (
            <Mic size={22} color={colors.accent.primary} strokeWidth={2} />
          )}
        </Pressable>
      </View>

      <TranscriptSheet
        transcript={voiceStatus.data?.transcript ?? null}
        isVisible={transcriptVisible}
        onProcess={handleTranscriptProcess}
        onDismiss={handleTranscriptDismiss}
      />

      <ConfirmCard
        data={voiceStatus.data?.extracted_data ?? null}
        accounts={activeAccounts}
        defaultAccountId={defaultAccount?.id ?? null}
        isVisible={voiceConfirmVisible}
        isSaving={confirmVoiceTransaction.isPending}
        onSave={handleVoiceConfirm}
        onDismiss={handleVoiceConfirmDismiss}
      />

      <ConfirmCard
        data={receiptStatus.data?.extracted_data ?? null}
        accounts={activeAccounts}
        defaultAccountId={defaultAccount?.id ?? null}
        isVisible={receiptConfirmVisible}
        isSaving={confirmReceiptTransaction.isPending}
        onSave={handleReceiptConfirm}
        onDismiss={handleReceiptConfirmDismiss}
      />
    </SafeAreaView>
  );
}

// ─── Bubble components ────────────────────────────────────────────────────────

function UserBubble({ message }: { message: UserTextMessage }) {
  return (
    <View style={userBubbleStyles.wrap}>
      <View style={userBubbleStyles.bubble}>
        <Text style={userBubbleStyles.text}>{message.content}</Text>
      </View>
    </View>
  );
}

function AIBubble({ message }: { message: AIMessage }) {
  return (
    <View style={aiBubbleStyles.wrap}>
      <View style={aiBubbleStyles.bubble}>
        {message.isTyping ? (
          <TypingIndicator />
        ) : (
          <Text style={aiBubbleStyles.text}>{message.content}</Text>
        )}
      </View>
    </View>
  );
}

function TypingDot({ delay }: { delay: number }) {
  const y = useSharedValue(0);

  useEffect(() => {
    y.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(-5, { duration: 300 }),
          withTiming(0, { duration: 300 })
        ),
        -1
      )
    );
  }, [delay, y]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: y.value }],
  }));

  return <Animated.View style={[aiBubbleStyles.dot, style]} />;
}

function TypingIndicator() {
  return (
    <View style={aiBubbleStyles.typingRow}>
      <TypingDot delay={0} />
      <TypingDot delay={150} />
      <TypingDot delay={300} />
    </View>
  );
}

const STATUS_LABELS: Record<string, string> = {
  pending: "Uploading...",
  transcribing: "Transcribing...",
  transcribed: "Reviewing transcript",
  extracting: "Extracting transaction...",
  completed: "Done",
  failed: "Failed",
};

function ChatBubble({ message }: { message: ChatMessage }) {
  const isProcessing =
    message.status !== "completed" && message.status !== "failed";

  return (
    <View style={bubbleStyles.wrap}>
      <View style={bubbleStyles.bubble}>
        <Text style={bubbleStyles.typeLabel}>
          {message.type === "voice" ? "Voice" : "Receipt"}
        </Text>
        <Text
          style={[
            bubbleStyles.status,
            message.status === "failed" && bubbleStyles.statusFailed,
            message.status === "completed" && bubbleStyles.statusDone,
          ]}
        >
          {STATUS_LABELS[message.status] ?? message.status}
        </Text>
        {message.transcript && message.status === "transcribed" && (
          <Text style={bubbleStyles.transcript} numberOfLines={3}>
            {message.transcript}
          </Text>
        )}
        {message.extractedData && message.status === "completed" && (
          <Text style={bubbleStyles.amount}>
            {message.extractedData.currency}{" "}
            {message.extractedData.amount.toLocaleString()}
          </Text>
        )}
        {message.errorMessage && (
          <Text style={bubbleStyles.error}>{message.errorMessage}</Text>
        )}
        {isProcessing && (
          <ActivityIndicator
            size="small"
            color={colors.accent.primary}
            style={bubbleStyles.spinner}
          />
        )}
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg.canvas,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing["2xl"],
    gap: spacing.sm,
  },
  emptyTitle: {
    ...StyleSheet.flatten(textStyles.h2),
    color: colors.text.primary,
    textAlign: "center",
  },
  emptySubtitle: {
    ...StyleSheet.flatten(textStyles.body),
    color: colors.text.muted,
    textAlign: "center",
  },
  messageList: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border.default,
    gap: spacing.md,
  },
  inputBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    backgroundColor: colors.accent.subtle,
    alignItems: "center",
    justifyContent: "center",
  },
  inputBtnDisabled: {
    opacity: 0.5,
  },
  textInput: {
    flex: 1,
    ...StyleSheet.flatten(textStyles.body),
    color: colors.text.primary,
    backgroundColor: colors.bg.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border.default,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 40,
  },
  micBtn: {
    width: 52,
    height: 52,
    borderRadius: radius.full,
    backgroundColor: "#E8E6FF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#7B6FE8",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  micBtnRecording: {
    backgroundColor: colors.danger.bg,
    borderWidth: 1,
    borderColor: `${colors.danger.text}80`,
  },
});

const userBubbleStyles = StyleSheet.create({
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

const aiBubbleStyles = StyleSheet.create({
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
  text: {
    ...StyleSheet.flatten(textStyles.body),
    color: colors.text.primary,
  },
  typingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.text.muted,
  },
});

const bubbleStyles = StyleSheet.create({
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
