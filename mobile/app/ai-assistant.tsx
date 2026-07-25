import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { Camera, Mic, SendHorizontal, Square, Trash2, Wallet } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { Header } from "@/components/layout/Header";
import { Gate } from "@/components/ui/Gate";
import GuestGate from "@/components/ui/GuestGate";
import { OverflowMenu } from "@/components/ui/OverflowMenu";
import { ConfirmCard } from "@/components/voice/ConfirmCard";
import type { ConfirmPayload } from "@/components/voice/ConfirmCard";
import { RecordingIndicator } from "@/components/voice/RecordingIndicator";
import { TranscriptSheet } from "@/components/voice/TranscriptSheet";
import { AIBubble } from "@/features/ai/components/AIBubble";
import { ChatBubble } from "@/features/ai/components/ChatBubble";
import { DraftTransactionCard } from "@/features/ai/components/DraftTransactionCard";
import { MessageActionMenu } from "@/features/ai/components/MessageActionMenu";
import { QuickActionsMenu } from "@/features/ai/components/QuickActionsMenu";
import { UserBubble } from "@/features/ai/components/UserBubble";
import { useCancelAiDraft } from "@/features/ai/hooks/useCancelAiDraft";
import { useChat } from "@/features/ai/hooks/useChat";
import { useConfirmAiDraft } from "@/features/ai/hooks/useConfirmAiDraft";
import { useAccounts } from "@/features/finance/hooks/useAccounts";
import { useCategories } from "@/features/finance/hooks/useCategories";
import { useReceiptStatuses, useUploadReceipt } from "@/features/finance/hooks/useReceipt";
import { useExtractVoice, useUploadAudio, useVoiceStatus } from "@/features/finance/hooks/useVoice";
import {
  applyVoiceStatus,
  applyReceiptStatus,
  createDraftMessages,
  createFailedUploadMessage,
  createReceiptMessage,
  createVoiceMessage,
  extractionToDraftTransactions,
  getActiveReceiptIds,
  setDraftState,
  staleTrackedIds,
  updateMessageIfChanged,
} from "@/features/finance/utils/chatMessageUtils";
import { persistPickedImage } from "@/features/finance/utils/persistPickedImage";
import { persistRecordedAudio } from "@/features/finance/utils/persistRecordedAudio";
import { clearPersistedMedia } from "@/features/finance/utils/persistToAppStorage";
import type {
  AIMessage,
  ChatMessage,
  DraftMessage,
  DraftMessageState,
  Message,
  UserTextMessage,
} from "@/features/finance/utils/chatMessageUtils";
import { QUICK_CHIPS, resolveQuickChipAction } from "@/features/ai/utils/quickChips";
import { useIdTimeoutBackstop } from "@/hooks/useIdTimeoutBackstop";
import { useVoiceRecorder } from "@/hooks/useVoiceRecorder";
import { useAuthStore } from "@/stores/auth";
import { useToastStore } from "@/stores/toast";
import { colors, radius, spacing, textStyles } from "@/theme";

// Backend self-heals a stuck job after 5 minutes (service.py _STUCK_JOB_TIMEOUT);
// this backstop only covers polling itself silently dying, so it must stay above that.
const STUCK_JOB_TIMEOUT_MS = 5 * 60_000 + 30_000;
const SCROLL_DEBOUNCE_MS = 100;
const QUICK_ACTIONS_ANIM_MS = 200; // matches QuickActionsMenu's own open/close animation

export default function AIAssistantScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { isGuest } = useAuthStore();
  const showToast = useToastStore((s) => s.showToast);
  const { data: accounts, isLoading: isLoadingAccounts } = useAccounts();
  const { data: categories } = useCategories();
  const {
    messages,
    setMessages,
    sendMessage,
    retryMessage,
    deleteMessage,
    isLoadingHistory,
    clearChat,
  } = useChat();
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
  const [editingDraft, setEditingDraft] = useState<DraftMessage | null>(null);
  const [quickActionsVisible, setQuickActionsVisible] = useState(false);
  const [actionMenu, setActionMenu] = useState<{
    message: UserTextMessage | AIMessage;
    x: number;
    y: number;
  } | null>(null);

  const [inputText, setInputText] = useState("");
  const listRef = useRef<FlatList<Message>>(null);
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const receiptAccountIds = useRef<Map<string, string>>(new Map());
  const handledReceiptIds = useRef<Set<string>>(new Set());

  const voiceStatus = useVoiceStatus(voiceLogId);
  const activeReceiptIds = useMemo(() => getActiveReceiptIds(messages), [messages]);
  const receiptStatuses = useReceiptStatuses(activeReceiptIds);

  const activeAccounts = useMemo(
    () => accounts?.filter((a) => !a.is_archived) ?? [],
    [accounts]
  );
  const defaultAccount = activeAccounts[0] ?? null;
  const hasNoAccounts = !isGuest && !isLoadingAccounts && activeAccounts.length === 0;

  const isMicBusy = recorderProcessing || uploadAudio.isPending || voiceLogId !== null;
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

  // Tracks every in-flight receipt by id so a second scan can't orphan the first.
  useEffect(() => {
    receiptStatuses.forEach((query, index) => {
      const id = activeReceiptIds[index];
      const data = query.data;
      if (!id || !data) return;

      setMessages((prev) => updateMessageIfChanged(prev, id, (m) => applyReceiptStatus(m, data)));

      if (data.status !== "completed" && data.status !== "failed") return;
      if (handledReceiptIds.current.has(id)) return;
      handledReceiptIds.current.add(id);
      const accountId = receiptAccountIds.current.get(id) ?? defaultAccount?.id;
      receiptAccountIds.current.delete(id);

      if (data.status === "completed") {
        const { extracted_data, transaction_ids } = data;
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
      } else {
        showToast(data.error_message ?? t("ai.toast.receiptProcessingFailed"), "error");
      }
    });
  }, [setMessages, showToast, receiptStatuses, activeReceiptIds, defaultAccount, t]);

  const handleReceiptTimeout = useCallback(
    (id: string) => {
      setMessages((prev) =>
        updateMessageIfChanged(prev, id, (m) => ({
          ...m,
          status: "failed",
          errorMessage: t("ai.toast.processingTimeoutInline"),
        }))
      );
      showToast(t("ai.toast.receiptProcessingTimeout"), "error");
    },
    [setMessages, showToast, t]
  );

  useIdTimeoutBackstop(activeReceiptIds, STUCK_JOB_TIMEOUT_MS, handleReceiptTimeout);

  const activeVoiceIds = useMemo(() => (voiceLogId ? [voiceLogId] : []), [voiceLogId]);

  const handleVoiceTimeout = useCallback(
    (id: string) => {
      setMessages((prev) =>
        updateMessageIfChanged(prev, id, (m) => ({
          ...m,
          status: "failed",
          errorMessage: t("ai.toast.processingTimeoutInline"),
        }))
      );
      setVoiceLogId(null);
      setTranscriptVisible(false);
      resetRecorder();
      showToast(t("ai.toast.voiceProcessingTimeout"), "error");
    },
    [setMessages, showToast, resetRecorder, t]
  );

  useIdTimeoutBackstop(activeVoiceIds, STUCK_JOB_TIMEOUT_MS, handleVoiceTimeout);

  useEffect(() => {
    return () => {
      if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
    };
  }, []);

  // Receipt/voice messages aren't restored from chat history, so any file
  // persisted last session is already orphaned by the time this screen mounts.
  useEffect(() => {
    clearPersistedMedia();
  }, []);

  useEffect(() => {
    for (const id of staleTrackedIds(handledReceiptIds.current, messages)) {
      handledReceiptIds.current.delete(id);
    }
    for (const id of staleTrackedIds(receiptAccountIds.current.keys(), messages)) {
      receiptAccountIds.current.delete(id);
    }
  }, [messages]);

  const handleContentSizeChange = useCallback(() => {
    if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
    scrollTimerRef.current = setTimeout(() => {
      listRef.current?.scrollToEnd({ animated: true });
    }, SCROLL_DEBOUNCE_MS);
  }, []);

  // Re-pin to bottom after the accordion's own 200ms open/close animation settles.
  useEffect(() => {
    if (messages.length === 0) return;
    if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
    scrollTimerRef.current = setTimeout(() => {
      listRef.current?.scrollToEnd({ animated: true });
    }, QUICK_ACTIONS_ANIM_MS + SCROLL_DEBOUNCE_MS);
  }, [quickActionsVisible, messages.length]);

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

  const handleMessageLongPress = useCallback(
    (message: UserTextMessage | AIMessage, x: number, y: number) => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setActionMenu({ message, x, y });
    },
    []
  );

  const handleCopyMessage = useCallback(() => {
    const message = actionMenu?.message;
    setActionMenu(null);
    if (!message) return;
    const text = message.type === "user" ? message.content : (message.content ?? "");
    void Clipboard.setStringAsync(text);
    showToast(t("ai.messageActions.copiedToast"), "success");
  }, [actionMenu, showToast, t]);

  const handleDeleteMessage = useCallback(() => {
    const message = actionMenu?.message;
    setActionMenu(null);
    if (!message) return;
    Alert.alert(
      t("ai.messageActions.deleteConfirmTitle"),
      t("ai.messageActions.deleteConfirmMessage"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.delete"),
          style: "destructive",
          onPress: () => {
            void deleteMessage(message).catch(() =>
              showToast(t("ai.messageActions.deleteFailedToast"), "error")
            );
          },
        },
      ]
    );
  }, [actionMenu, deleteMessage, showToast, t]);

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
        receiptAccountIds.current.set(response.receipt_log_id, accountId);
        setMessages((prev) => [
          ...prev,
          createReceiptMessage(response.receipt_log_id, imageUri, accountId),
        ]);
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
    if (isRecording) return;
    if (isMicBusy) {
      showToast(t("ai.toast.voiceStillProcessing"), "error");
      return;
    }
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
      const persistedUri = persistRecordedAudio(audioUri);
      await uploadVoiceFlow(persistedUri, defaultAccount.id);
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
    const persistedUri = persistPickedImage(result.assets[0].uri);
    await uploadReceiptFlow(persistedUri, defaultAccount.id);
  }, [defaultAccount, showToast, uploadReceiptFlow, t]);

  const handleQuickChip = useCallback(
    (chip: (typeof QUICK_CHIPS)[number]) => {
      setQuickActionsVisible(false);
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
      if (item.type === "user")
        return <UserBubble message={item} onLongPress={handleMessageLongPress} />;
      if (item.type === "ai")
        return (
          <AIBubble
            message={item as AIMessage}
            onRetry={handleRetryAiMessage}
            onLongPress={handleMessageLongPress}
          />
        );
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
    [
      handleDraftCancel,
      handleDraftEdit,
      handleDraftSave,
      handleMessageLongPress,
      handleRetry,
      handleRetryAiMessage,
    ]
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

      {/* Guest gate takes priority; then the no-account gate for signed-in users */}
      {isGuest ? (
        <GuestGate subtitle={t("ai.guestSubtitle")} />
      ) : hasNoAccounts ? (
        <Gate
          icon={<Wallet size={48} color={colors.accent.primary} strokeWidth={1.5} />}
          title={t("ai.accountGate.title")}
          subtitle={t("ai.accountGate.subtitle")}
          ctaLabel={t("ai.accountGate.cta")}
          onCtaPress={() => router.push("/(app)/accounts")}
        />
      ) : (
      <>
      <KeyboardAvoidingView style={styles.keyboardAvoider} behavior="padding">
      {/* Chat area */}
      <View style={styles.chatArea}>
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
            <QuickActionsMenu
              chips={QUICK_CHIPS}
              visible={quickActionsVisible}
              onToggle={() => setQuickActionsVisible((v) => !v)}
              onSelect={handleQuickChip}
              busyChipId={isCameraBusy ? "scanReceipt" : undefined}
            />
          </View>
        ) : (
          <FlatList
            ref={listRef}
            style={styles.messageListFlex}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={renderMessage}
            contentContainerStyle={styles.messageList}
            onContentSizeChange={handleContentSizeChange}
            ListFooterComponent={
              <QuickActionsMenu
                chips={QUICK_CHIPS}
                visible={quickActionsVisible}
                onToggle={() => setQuickActionsVisible((v) => !v)}
                onSelect={handleQuickChip}
                busyChipId={isCameraBusy ? "scanReceipt" : undefined}
              />
            }
          />
        )}

        {/* Recording indicator */}
        {isRecording && (
          <RecordingIndicator
            durationMs={recordingDurationMs}
            onCancel={() => void cancelRecording()}
          />
        )}
      </View>

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
      </KeyboardAvoidingView>

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

      <MessageActionMenu
        visible={actionMenu !== null}
        x={actionMenu?.x ?? 0}
        y={actionMenu?.y ?? 0}
        onCopy={handleCopyMessage}
        onDelete={handleDeleteMessage}
        onDismiss={() => setActionMenu(null)}
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
  keyboardAvoider: {
    flex: 1,
  },
  chatArea: {
    flex: 1,
    position: "relative",
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
  messageListFlex: {
    flex: 1,
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
});
