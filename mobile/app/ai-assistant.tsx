import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { Camera, Mic, SendHorizontal, Square, Trash2 } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { Header } from "@/components/layout/Header";
import GuestGate from "@/components/ui/GuestGate";
import { OverflowMenu } from "@/components/ui/OverflowMenu";
import { ConfirmCard } from "@/components/voice/ConfirmCard";
import type { ConfirmPayload } from "@/components/voice/ConfirmCard";
import { RecordingIndicator } from "@/components/voice/RecordingIndicator";
import { TranscriptSheet } from "@/components/voice/TranscriptSheet";
import { AIBubble } from "@/features/ai/components/AIBubble";
import { ChatBubble } from "@/features/ai/components/ChatBubble";
import { DraftTransactionCard } from "@/features/ai/components/DraftTransactionCard";
import { UserBubble } from "@/features/ai/components/UserBubble";
import { useCancelAiDraft } from "@/features/ai/hooks/useCancelAiDraft";
import { useChat } from "@/features/ai/hooks/useChat";
import { useConfirmAiDraft } from "@/features/ai/hooks/useConfirmAiDraft";
import { useAccounts } from "@/features/finance/hooks/useAccounts";
import { useCategories } from "@/features/finance/hooks/useCategories";
import { useReceiptStatus, useUploadReceipt } from "@/features/finance/hooks/useReceipt";
import { useExtractVoice, useUploadAudio, useVoiceStatus } from "@/features/finance/hooks/useVoice";
import {
  applyReceiptStatus,
  applyVoiceStatus,
  createDraftMessages,
  createFailedUploadMessage,
  createReceiptMessage,
  createVoiceMessage,
  extractionToDraftTransactions,
  setDraftState,
} from "@/features/finance/utils/chatMessageUtils";
import type {
  AIMessage,
  ChatMessage,
  DraftMessage,
  DraftMessageState,
  Message,
} from "@/features/finance/utils/chatMessageUtils";
import { QUICK_CHIPS, resolveQuickChipAction } from "@/features/ai/utils/quickChips";
import { useVoiceRecorder } from "@/hooks/useVoiceRecorder";
import { useAuthStore } from "@/stores/auth";
import { useToastStore } from "@/stores/toast";
import { colors, radius, spacing, textStyles } from "@/theme";

const PROCESSING_TIMEOUT_MS = 60_000;
const SCROLL_DEBOUNCE_MS = 100;

export default function AIAssistantScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { isGuest } = useAuthStore();
  const showToast = useToastStore((s) => s.showToast);
  const { data: accounts } = useAccounts();
  const { data: categories } = useCategories();
  const { messages, setMessages, sendMessage, retryMessage, isLoadingHistory, clearChat } =
    useChat();
  const confirmAiDraftMutation = useConfirmAiDraft();
  const cancelAiDraftMutation = useCancelAiDraft();

  // Voice hooks
  const uploadAudio = useUploadAudio();
  const extractVoice = useExtractVoice();
  const {
    isRecording,
    isProcessing: recorderProcessing,
    durationMs: recordingDurationMs,
    errorMessage: recordingError,
    startRecording,
    stopRecording,
    cancelRecording,
    reset: resetRecorder,
  } = useVoiceRecorder();

  // Receipt hooks
  const uploadReceipt = useUploadReceipt();

  // Processing state
  const [voiceLogId, setVoiceLogId] = useState<string | null>(null);
  const [transcriptVisible, setTranscriptVisible] = useState(false);
  const [receiptLogId, setReceiptLogId] = useState<string | null>(null);
  const [editingDraft, setEditingDraft] = useState<DraftMessage | null>(null);

  const [inputText, setInputText] = useState("");
  const listRef = useRef<FlatList<Message>>(null);
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const voiceStatus = useVoiceStatus(voiceLogId);
  const receiptStatus = useReceiptStatus(receiptLogId);

  const activeAccounts = useMemo(
    () => accounts?.filter((a) => !a.is_archived) ?? [],
    [accounts]
  );
  const defaultAccount = activeAccounts[0] ?? null;

  const isMicBusy = recorderProcessing || uploadAudio.isPending;
  const isCameraBusy = uploadReceipt.isPending;

  // Surface recorder errors (permission denied, too-short takes) as toasts
  useEffect(() => {
    if (!recordingError) return;
    showToast(recordingError, "error");
    resetRecorder();
  }, [recordingError, resetRecorder, showToast]);

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
      const { extracted_data, transaction_ids } = voiceStatus.data;
      const accountId = defaultAccount?.id;
      if (extracted_data.length > 0 && transaction_ids.length > 0 && accountId) {
        setMessages((prev) => [
          ...prev,
          ...createDraftMessages(
            extractionToDraftTransactions(extracted_data, transaction_ids, accountId)
          ),
        ]);
      } else {
        showToast(t("ai.toast.noVoiceDraft"), "error");
      }
      setVoiceLogId(null);
    } else if (voiceStatus.data.status === "failed") {
      resetRecorder();
      setVoiceLogId(null);
      showToast(voiceStatus.data.error_message ?? t("ai.toast.voiceProcessingFailed"), "error");
    }
  }, [resetRecorder, setMessages, showToast, voiceLogId, voiceStatus.data, defaultAccount, t]);

  // Update receipt message as status changes
  useEffect(() => {
    if (!receiptLogId || !receiptStatus.data) return;
    setMessages((prev) =>
      prev.map((m) =>
        m.id === receiptLogId ? applyReceiptStatus(m as ChatMessage, receiptStatus.data!) : m
      )
    );
    if (receiptStatus.data.status === "completed") {
      const { extracted_data, transaction_ids } = receiptStatus.data;
      const accountId = defaultAccount?.id;
      if (extracted_data.length > 0 && transaction_ids.length > 0 && accountId) {
        setMessages((prev) => [
          ...prev,
          ...createDraftMessages(
            extractionToDraftTransactions(extracted_data, transaction_ids, accountId)
          ),
        ]);
      } else {
        showToast(t("ai.toast.noReceiptDraft"), "error");
      }
      setReceiptLogId(null);
    } else if (receiptStatus.data.status === "failed") {
      setReceiptLogId(null);
      showToast(receiptStatus.data.error_message ?? t("ai.toast.receiptProcessingFailed"), "error");
    }
  }, [setMessages, showToast, receiptLogId, receiptStatus.data, defaultAccount, t]);

  // Auto-fail voice if worker never responds
  useEffect(() => {
    if (!voiceLogId) return;
    const id = voiceLogId;
    const timer = setTimeout(() => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === id
            ? {
                ...(m as ChatMessage),
                status: "failed",
                errorMessage: t("ai.toast.processingTimeoutInline"),
              }
            : m
        )
      );
      setVoiceLogId(null);
      setTranscriptVisible(false);
      resetRecorder();
      showToast(t("ai.toast.voiceProcessingTimeout"), "error");
    }, PROCESSING_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [voiceLogId, t]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-fail receipt if worker never responds
  useEffect(() => {
    if (!receiptLogId) return;
    const id = receiptLogId;
    const timer = setTimeout(() => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === id
            ? {
                ...(m as ChatMessage),
                status: "failed",
                errorMessage: t("ai.toast.processingTimeoutInline"),
              }
            : m
        )
      );
      setReceiptLogId(null);
      showToast(t("ai.toast.receiptProcessingTimeout"), "error");
    }, PROCESSING_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [receiptLogId, t]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    return () => {
      if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
    };
  }, []);

  const handleContentSizeChange = useCallback(() => {
    if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
    scrollTimerRef.current = setTimeout(() => {
      listRef.current?.scrollToEnd({ animated: true });
    }, SCROLL_DEBOUNCE_MS);
  }, []);

  const handleSendText = useCallback(() => {
    const text = inputText.trim();
    if (!text) return;
    setInputText("");
    void sendMessage(text);
  }, [inputText, sendMessage]);

  const handleClearChat = useCallback(() => {
    Alert.alert(t("ai.clearChat.menuLabel"), t("ai.clearChat.alertMessage"), [
      { text: t("common.cancel"), style: "cancel" },
      { text: t("common.delete"), style: "destructive", onPress: () => void clearChat() },
    ]);
  }, [clearChat, t]);

  const uploadVoiceFlow = useCallback(
    async (audioUri: string, accountId: string) => {
      try {
        const response = await uploadAudio.mutateAsync({ audioUri, accountId });
        setMessages((prev) => [
          ...prev,
          createVoiceMessage(response.voice_log_id, audioUri, accountId),
        ]);
        setVoiceLogId(response.voice_log_id);
      } catch {
        resetRecorder();
        setMessages((prev) => [
          ...prev,
          createFailedUploadMessage("voice", audioUri, accountId, t("ai.toast.voiceUploadFailed")),
        ]);
        showToast(t("ai.toast.voiceUploadFailed"), "error");
      }
    },
    [resetRecorder, setMessages, showToast, uploadAudio, t]
  );

  const uploadReceiptFlow = useCallback(
    async (imageUri: string, accountId: string) => {
      try {
        const response = await uploadReceipt.mutateAsync({ imageUri, accountId });
        setMessages((prev) => [
          ...prev,
          createReceiptMessage(response.receipt_log_id, imageUri, accountId),
        ]);
        setReceiptLogId(response.receipt_log_id);
      } catch {
        setMessages((prev) => [
          ...prev,
          createFailedUploadMessage("receipt", imageUri, accountId, t("ai.toast.receiptUploadFailed")),
        ]);
        showToast(t("ai.toast.receiptUploadFailed"), "error");
      }
    },
    [setMessages, showToast, uploadReceipt, t]
  );

  const handleRetry = useCallback(
    (message: ChatMessage) => {
      if (!message.localUri || !message.accountId) return;
      setMessages((prev) => prev.filter((m) => m.id !== message.id));
      if (message.type === "voice") void uploadVoiceFlow(message.localUri, message.accountId);
      else void uploadReceiptFlow(message.localUri, message.accountId);
    },
    [setMessages, uploadReceiptFlow, uploadVoiceFlow]
  );

  const handleRetryAiMessage = useCallback(
    (message: AIMessage) => {
      void retryMessage(message);
    },
    [retryMessage]
  );

  const handleMicPressIn = useCallback(() => {
    if (isMicBusy || isRecording) return;
    if (!defaultAccount) {
      showToast(t("transaction.noAccountsPrompt"), "error");
      return;
    }
    void startRecording();
  }, [defaultAccount, isMicBusy, isRecording, showToast, startRecording, t]);

  const handleMicPressOut = useCallback(() => {
    if (!isRecording || !defaultAccount) return;
    void (async () => {
      const audioUri = await stopRecording();
      if (!audioUri) return;
      await uploadVoiceFlow(audioUri, defaultAccount.id);
    })();
  }, [defaultAccount, isRecording, stopRecording, uploadVoiceFlow]);

  const handleCameraPress = useCallback(async () => {
    if (!defaultAccount) {
      showToast(t("ai.toast.createAccountForScan"), "error");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      quality: 0.8,
      allowsEditing: false,
    });
    if (result.canceled || !result.assets[0]) return;
    await uploadReceiptFlow(result.assets[0].uri, defaultAccount.id);
  }, [defaultAccount, showToast, uploadReceiptFlow, t]);

  const handleQuickChip = useCallback(
    (chip: (typeof QUICK_CHIPS)[number]) => {
      const resolved = resolveQuickChipAction(chip);
      if (resolved.kind === "camera") void handleCameraPress();
      else void sendMessage(resolved.text);
    },
    [handleCameraPress, sendMessage]
  );

  const handleTranscriptProcess = useCallback(
    (transcript: string) => {
      if (!voiceLogId) return;
      setTranscriptVisible(false);
      void extractVoice
        .mutateAsync({ voiceLogId, transcript })
        .catch(() => showToast(t("ai.toast.transcriptProcessFailed"), "error"));
    },
    [extractVoice, showToast, voiceLogId, t]
  );

  const handleTranscriptDismiss = useCallback(() => {
    setTranscriptVisible(false);
    setVoiceLogId(null);
    setMessages((prev) => prev.filter((m) => m.id !== voiceLogId));
    resetRecorder();
  }, [resetRecorder, setMessages, voiceLogId]);

  const updateDraftMessage = useCallback(
    (id: string, state: DraftMessageState) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === id && m.type === "draft" ? setDraftState(m, state) : m))
      );
    },
    [setMessages]
  );

  const handleDraftSave = useCallback(
    (msg: DraftMessage) => {
      const { draft } = msg;
      const categoryId =
        categories?.find(
          (c) => c.name.toLowerCase() === (draft.category_name ?? "").toLowerCase()
        )?.id ?? null;
      updateDraftMessage(msg.id, "saving");
      void confirmAiDraftMutation
        .mutateAsync({
          transactionId: draft.transaction_id,
          payload: {
            amount: draft.amount,
            accountId: draft.account_id,
            categoryId,
            merchant: draft.merchant,
            note: draft.note,
          },
        })
        .then(() => {
          updateDraftMessage(msg.id, "saved");
          showToast(t("ai.toast.transactionSaved"), "success");
        })
        .catch(() => {
          updateDraftMessage(msg.id, "pending");
          showToast(t("ai.toast.transactionSaveFailed"), "error");
        });
    },
    [categories, confirmAiDraftMutation, showToast, updateDraftMessage, t]
  );

  const handleDraftCancel = useCallback(
    (msg: DraftMessage) => {
      updateDraftMessage(msg.id, "saving");
      void cancelAiDraftMutation
        .mutateAsync(msg.draft.transaction_id)
        .then(() => updateDraftMessage(msg.id, "cancelled"))
        .catch(() => {
          updateDraftMessage(msg.id, "pending");
          showToast(t("ai.toast.draftCancelFailed"), "error");
        });
    },
    [cancelAiDraftMutation, showToast, updateDraftMessage, t]
  );

  const handleDraftEdit = useCallback((msg: DraftMessage) => {
    setEditingDraft(msg);
  }, []);

  const handleEditingDraftSave = useCallback(
    (payload: ConfirmPayload) => {
      if (!editingDraft) return;
      const id = editingDraft.id;
      setEditingDraft(null);
      updateDraftMessage(id, "saving");
      void confirmAiDraftMutation
        .mutateAsync({ transactionId: editingDraft.draft.transaction_id, payload })
        .then(() => {
          updateDraftMessage(id, "saved");
          showToast(t("ai.toast.transactionSaved"), "success");
        })
        .catch(() => {
          updateDraftMessage(id, "pending");
          showToast(t("ai.toast.transactionSaveFailed"), "error");
        });
    },
    [confirmAiDraftMutation, editingDraft, showToast, updateDraftMessage, t]
  );

  const renderMessage = useCallback(
    ({ item }: { item: Message }) => {
      if (item.type === "user") return <UserBubble message={item} />;
      if (item.type === "ai")
        return <AIBubble message={item as AIMessage} onRetry={handleRetryAiMessage} />;
      if (item.type === "draft")
        return (
          <DraftTransactionCard
            message={item}
            onSave={handleDraftSave}
            onEdit={handleDraftEdit}
            onCancel={handleDraftCancel}
          />
        );
      return <ChatBubble message={item as ChatMessage} onRetry={handleRetry} />;
    },
    [handleDraftCancel, handleDraftEdit, handleDraftSave, handleRetry, handleRetryAiMessage]
  );

  const isSendMode = inputText.length > 0;

  return (
    <SafeAreaView style={styles.screen} edges={["top", "left", "right", "bottom"]}>
      <Header
        title={t("ai.headerTitle")}
        onBack={() => router.back()}
        right={
          <OverflowMenu
            items={[
              {
                label: t("ai.clearChat.menuLabel"),
                icon: <Trash2 size={15} color={colors.danger.text} />,
                destructive: true,
                onPress: handleClearChat,
              },
            ]}
          />
        }
      />

      {/* Guest gate */}
      {isGuest ? (
        <GuestGate subtitle={t("ai.guestSubtitle")} />
      ) : (
      <>
      {/* Chat area */}
      {isLoadingHistory ? (
        <View style={styles.historyLoader}>
          <ActivityIndicator color={colors.accent.primary} />
        </View>
      ) : messages.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyGreeting}>
            <Text style={styles.emptyTitle}>{t("ai.emptyTitle")}</Text>
            <Text style={styles.emptySubtitle}>{t("ai.emptySubtitle")}</Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.chipsRow}
            contentContainerStyle={styles.quickChips}
          >
            {QUICK_CHIPS.map((chip) => (
              <Pressable
                key={chip.id}
                onPress={() => handleQuickChip(chip)}
                style={({ pressed }) => pressed && { opacity: 0.7 }}
              >
                <View style={styles.chip}>
                  <Text style={styles.chipLabel}>{t(chip.labelKey)}</Text>
                </View>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.messageList}
          onContentSizeChange={handleContentSizeChange}
        />
      )}

      {/* Quick chips during conversation */}
      {messages.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipsRow}
          contentContainerStyle={styles.quickChips}
        >
          {QUICK_CHIPS.map((chip) => (
            <Pressable
              key={chip.id}
              onPress={() => handleQuickChip(chip)}
              style={({ pressed }) => pressed && { opacity: 0.7 }}
            >
              <View style={styles.chip}>
                <Text style={styles.chipLabel}>{t(chip.labelKey)}</Text>
              </View>
            </Pressable>
          ))}
        </ScrollView>
      )}

      {/* Recording indicator */}
      {isRecording && (
        <RecordingIndicator
          durationMs={recordingDurationMs}
          onCancel={() => void cancelRecording()}
        />
      )}

      {/* Input bar */}
      <View style={styles.inputBar}>
        <Pressable onPress={() => void handleCameraPress()} disabled={isCameraBusy} hitSlop={8}>
          {({ pressed }) => (
            <View
              style={[
                styles.inputBtn,
                isCameraBusy && styles.inputBtnDisabled,
                pressed && styles.btnPressed,
              ]}
            >
              {isCameraBusy ? (
                <ActivityIndicator size="small" color={colors.accent.primary} />
              ) : (
                <Camera size={22} color={colors.accent.primary} strokeWidth={1.8} />
              )}
            </View>
          )}
        </Pressable>

        <TextInput
          style={styles.textInput}
          value={inputText}
          onChangeText={setInputText}
          placeholder={t("ai.inputPlaceholder")}
          placeholderTextColor={colors.text.muted}
          returnKeyType="send"
          onSubmitEditing={handleSendText}
          blurOnSubmit={false}
          maxLength={2000}
        />

        <Pressable
          onPressIn={isSendMode ? undefined : handleMicPressIn}
          onPressOut={isSendMode ? undefined : handleMicPressOut}
          onPress={isSendMode ? handleSendText : undefined}
          disabled={!isSendMode && isMicBusy && !isRecording}
          hitSlop={8}
        >
          {({ pressed }) => (
            <View
              style={[
                styles.micBtn,
                isRecording && styles.micBtnRecording,
                pressed && styles.btnPressed,
              ]}
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
            </View>
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
        data={
          editingDraft
            ? {
                amount: editingDraft.draft.amount,
                currency: editingDraft.draft.currency,
                merchant: editingDraft.draft.merchant,
                category_name: editingDraft.draft.category_name,
                note: editingDraft.draft.note,
                confidence: 1.0,
              }
            : null
        }
        accounts={activeAccounts}
        defaultAccountId={editingDraft?.draft.account_id ?? defaultAccount?.id ?? null}
        isVisible={editingDraft !== null}
        isSaving={confirmAiDraftMutation.isPending}
        onSave={handleEditingDraftSave}
        onDismiss={() => setEditingDraft(null)}
      />
      </>
      )}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg.canvas,
  },
  historyLoader: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyState: {
    flex: 1,
    paddingHorizontal: spacing["2xl"],
    paddingBottom: spacing.lg,
  },
  emptyGreeting: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
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
    backgroundColor: "#FCEFE8",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: `${colors.accent.primary}4D`,
    boxShadow: `0 2px 4px ${colors.accent.primary}40`,
  },
  btnPressed: {
    opacity: 0.7,
  },
  micBtnRecording: {
    backgroundColor: colors.danger.bg,
    borderWidth: 1,
    borderColor: `${colors.danger.text}80`,
  },
  chipsRow: {
    flexShrink: 0,
  },
  quickChips: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
  },
  chip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.bg.surface,
  },
  chipLabel: {
    ...StyleSheet.flatten(textStyles.body),
    color: colors.text.primary,
  },
});
