import { useRouter } from "expo-router";
import { ChevronDown, Camera, Mic, SendHorizontal, Square, Trash2, Wallet } from "lucide-react-native";
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
import type { NativeScrollEvent, NativeSyntheticEvent } from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { Header } from "@/components/layout/Header";
import { Coachmark, useCoachmarkAnchor } from "@/components/ui/Coachmark";
import { CopiedHint } from "@/components/ui/CopiedHint";
import { Gate } from "@/components/ui/Gate";
import GuestGate from "@/components/ui/GuestGate";
import { OverflowMenu } from "@/components/ui/OverflowMenu";
import { ConfirmCard } from "@/components/voice/ConfirmCard";
import { RecordingIndicator } from "@/components/voice/RecordingIndicator";
import { TranscriptSheet } from "@/components/voice/TranscriptSheet";
import { AIBubble } from "@/features/ai/components/AIBubble";
import { ChatBubble } from "@/features/ai/components/ChatBubble";
import { ChatHistorySkeleton } from "@/features/ai/components/ChatHistorySkeleton";
import { DateSeparator } from "@/features/ai/components/DateSeparator";
import { DraftTransactionCard } from "@/features/ai/components/DraftTransactionCard";
import { MessageActionMenu } from "@/features/ai/components/MessageActionMenu";
import { QuickActionsMenu } from "@/features/ai/components/QuickActionsMenu";
import { UserBubble } from "@/features/ai/components/UserBubble";
import { useChat } from "@/features/ai/hooks/useChat";
import { useDraftActions } from "@/features/ai/hooks/useDraftActions";
import { useMediaCapture } from "@/features/ai/hooks/useMediaCapture";
import { useMessageActions } from "@/features/ai/hooks/useMessageActions";
import { useDelayedLoading } from "@/hooks/useDelayedLoading";
import { useAccounts } from "@/features/finance/hooks/useAccounts";
import { useCategories } from "@/features/finance/hooks/useCategories";
import { isScrolledAwayFromBottom, withDateSeparators } from "@/features/finance/utils/chatMessageUtils";
import type { AIMessage, ChatListItem, ChatMessage } from "@/features/finance/utils/chatMessageUtils";
import { QUICK_CHIPS, resolveQuickChipAction } from "@/features/ai/utils/quickChips";
import { useAuthStore } from "@/stores/auth";
import { useOnboardingStore } from "@/stores/onboarding";
import { useToastStore } from "@/stores/toast";
import { colors, radius, spacing, textStyles } from "@/theme";

const SCROLL_DEBOUNCE_MS = 100;
const QUICK_ACTIONS_ANIM_MS = 200;

export default function AIAssistantScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { isGuest } = useAuthStore();
  const showToast = useToastStore((s) => s.showToast);
  const showCoachmark = !useOnboardingStore((s) => s.dismissedCoachmarks.aiChat);
  const dismissCoachmark = useOnboardingStore((s) => s.dismissCoachmark);
  const inputBarAnchor = useCoachmarkAnchor();
  const { data: accounts, isLoading: isLoadingAccounts } = useAccounts();
  const { data: categories } = useCategories();
  const {
    messages,
    setMessages,
    sessionId,
    syncSessionId,
    sendMessage,
    retryMessage,
    deleteMessage,
    isLoadingHistory,
    clearChat,
    guestQuota,
  } = useChat(accounts ?? []);

  const activeAccounts = useMemo(() => accounts?.filter((a) => !a.is_archived) ?? [], [accounts]);
  const defaultAccount = activeAccounts[0] ?? null;
  const hasNoAccounts = !isGuest && !isLoadingAccounts && activeAccounts.length === 0;

  const mediaCapture = useMediaCapture({
    messages,
    setMessages,
    showToast,
    sessionId,
    syncSessionId,
    defaultAccountId: defaultAccount?.id,
    t,
  });
  const draftActions = useDraftActions({ setMessages, categories, showToast, t });
  const messageActions = useMessageActions({ deleteMessage, showToast, t });
  const showHistorySkeleton = useDelayedLoading(isLoadingHistory);

  const [quickActionsVisible, setQuickActionsVisible] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [inputText, setInputText] = useState("");
  const listRef = useRef<FlatList<ChatListItem>>(null);
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const listItems = useMemo(() => withDateSeparators(messages), [messages]);

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
    setShowScrollButton(false);
  }, []);

  const handleScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setShowScrollButton(isScrolledAwayFromBottom(e.nativeEvent));
  }, []);

  const handleScrollToBottomPress = useCallback(() => {
    listRef.current?.scrollToEnd({ animated: true });
    setShowScrollButton(false);
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
    const hasPendingDraft = messages.some((m) => m.type === "draft" && m.state === "pending");
    Alert.alert(
      t("ai.clearChat.menuLabel"),
      hasPendingDraft
        ? t("ai.clearChat.alertMessagePendingDrafts")
        : t("ai.clearChat.alertMessage"),
      [
        { text: t("common.cancel"), style: "cancel" },
        { text: t("common.delete"), style: "destructive", onPress: () => void clearChat() },
      ]
    );
  }, [clearChat, messages, t]);

  const handleRetryAiMessage = useCallback(
    (message: AIMessage) => {
      void retryMessage(message);
    },
    [retryMessage]
  );

  const handleQuickChip = useCallback(
    (chip: (typeof QUICK_CHIPS)[number]) => {
      setQuickActionsVisible(false);
      const resolved = resolveQuickChipAction(chip);
      if (resolved.kind === "camera") void mediaCapture.handleCameraPress();
      else void sendMessage(resolved.text);
    },
    [mediaCapture, sendMessage]
  );

  const renderMessage = useCallback(
    ({ item }: { item: ChatListItem }) => {
      if (item.type === "dateSeparator") return <DateSeparator date={item.date} />;
      if (item.type === "user")
        return <UserBubble message={item} onLongPress={messageActions.handleMessageLongPress} />;
      if (item.type === "ai")
        return (
          <AIBubble
            message={item as AIMessage}
            onRetry={handleRetryAiMessage}
            onLongPress={messageActions.handleMessageLongPress}
          />
        );
      if (item.type === "draft")
        return (
          <DraftTransactionCard
            message={item}
            onSave={draftActions.handleDraftSave}
            onEdit={draftActions.handleDraftEdit}
            onCancel={draftActions.handleDraftCancel}
          />
        );
      return <ChatBubble message={item as ChatMessage} onRetry={mediaCapture.handleRetry} />;
    },
    [draftActions, handleRetryAiMessage, mediaCapture, messageActions]
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

      {isGuest && guestQuota === 0 ? (
        <GuestGate subtitle={t("ai.guestQuotaExhaustedSubtitle")} />
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
          <Coachmark
            visible={showCoachmark}
            anchor={inputBarAnchor.rect}
            text={t("coachmark.aiChatText")}
            onDismiss={() => void dismissCoachmark("aiChat")}
            dismissA11yLabel={t("coachmark.dismissAiChatA11y")}
            placement="above"
            gap={18}
          />
          <KeyboardAvoidingView style={styles.keyboardAvoider} behavior="padding">
            {/* Chat area */}
            <View style={styles.chatArea}>
              {showHistorySkeleton ? (
                <ChatHistorySkeleton />
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
                    busyChipId={mediaCapture.isCameraBusy ? "scanReceipt" : undefined}
                  />
                </View>
              ) : (
                <FlatList
                  ref={listRef}
                  style={styles.messageListFlex}
                  data={listItems}
                  keyExtractor={(item) => item.id}
                  renderItem={renderMessage}
                  contentContainerStyle={styles.messageList}
                  onContentSizeChange={handleContentSizeChange}
                  onScroll={handleScroll}
                  scrollEventThrottle={100}
                  ListFooterComponent={
                    <QuickActionsMenu
                      chips={QUICK_CHIPS}
                      visible={quickActionsVisible}
                      onToggle={() => setQuickActionsVisible((v) => !v)}
                      onSelect={handleQuickChip}
                      busyChipId={mediaCapture.isCameraBusy ? "scanReceipt" : undefined}
                    />
                  }
                />
              )}

              {showScrollButton && messages.length > 0 && (
                <Pressable
                  onPress={handleScrollToBottomPress}
                  hitSlop={8}
                  style={styles.scrollToBottomWrap}
                  accessibilityLabel={t("ai.scrollToBottomA11y")}
                >
                  {({ pressed }) => (
                    <View style={[styles.scrollToBottomBtn, pressed && styles.btnPressed]}>
                      <ChevronDown size={22} color={colors.accent.primary} strokeWidth={2.2} />
                    </View>
                  )}
                </Pressable>
              )}

              {/* Recording indicator */}
              {mediaCapture.isRecording && (
                <RecordingIndicator
                  durationMs={mediaCapture.recordingDurationMs}
                  onCancel={() => void mediaCapture.cancelRecording()}
                />
              )}

              {/* Floating, persistent reminder of the free trial's remaining
            messages — not a toast, doesn't auto-hide or push layout. */}
              {isGuest && guestQuota !== null && guestQuota > 0 && (
                <View pointerEvents="none" style={styles.guestQuotaPill}>
                  <Text style={styles.guestQuotaPillText}>
                    {t("ai.guestQuotaRemaining", { count: guestQuota })}
                  </Text>
                </View>
              )}
            </View>

            {/* Input bar */}
            <View
              style={styles.inputBar}
              ref={inputBarAnchor.ref}
              onLayout={inputBarAnchor.onLayout}
            >
              <Pressable
                onPress={() => void mediaCapture.handleCameraPress()}
                disabled={mediaCapture.isCameraBusy}
                hitSlop={8}
              >
                {({ pressed }) => (
                  <View
                    style={[
                      styles.inputBtn,
                      mediaCapture.isCameraBusy && styles.inputBtnDisabled,
                      pressed && styles.btnPressed,
                    ]}
                  >
                    {mediaCapture.isCameraBusy ? (
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
                onPressIn={isSendMode ? undefined : mediaCapture.handleMicPressIn}
                onPressOut={isSendMode ? undefined : mediaCapture.handleMicPressOut}
                onPress={isSendMode ? handleSendText : undefined}
                disabled={!isSendMode && mediaCapture.isMicBusy && !mediaCapture.isRecording}
                hitSlop={8}
              >
                {({ pressed }) => (
                  <View
                    style={[
                      styles.micBtn,
                      mediaCapture.isRecording && styles.micBtnRecording,
                      pressed && styles.btnPressed,
                    ]}
                  >
                    {mediaCapture.isMicBusy && !mediaCapture.isRecording && !isSendMode ? (
                      <ActivityIndicator color={colors.accent.primary} />
                    ) : mediaCapture.isRecording ? (
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
            transcript={mediaCapture.transcript}
            isVisible={mediaCapture.transcriptVisible}
            onProcess={mediaCapture.handleTranscriptProcess}
            onDismiss={mediaCapture.handleTranscriptDismiss}
          />

          <ConfirmCard
            data={draftActions.editingDraftData}
            accounts={activeAccounts}
            defaultAccountId={draftActions.editingDraft?.draft.account_id ?? defaultAccount?.id ?? null}
            isVisible={draftActions.editingDraft !== null}
            isSaving={draftActions.isSavingDraft}
            onSave={draftActions.handleEditingDraftSave}
            onDismiss={draftActions.dismissDraftEdit}
          />

          <MessageActionMenu
            visible={messageActions.actionMenu !== null}
            x={messageActions.actionMenu?.x ?? 0}
            y={messageActions.actionMenu?.y ?? 0}
            onCopy={messageActions.handleCopyMessage}
            onDelete={messageActions.handleDeleteMessage}
            onDismiss={messageActions.dismissActionMenu}
          />

          <CopiedHint
            visible={messageActions.showCopiedHint}
            label={t("ai.messageActions.copiedToast")}
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
  guestQuotaPill: {
    position: "absolute",
    top: spacing.sm,
    alignSelf: "center",
    zIndex: 10,
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
  guestQuotaPillText: {
    ...StyleSheet.flatten(textStyles.caption),
    color: colors.text.muted,
  },
  scrollToBottomWrap: {
    position: "absolute",
    right: spacing.lg,
    bottom: spacing.lg,
  },
  scrollToBottomBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: colors.bg.elevated,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border.default,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
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
