import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as ImagePicker from "expo-image-picker";
import { useFocusEffect } from "expo-router";
import type { TFunction } from "i18next";

import { useReceiptStatuses, useUploadReceipt } from "@/features/finance/hooks/useReceipt";
import { useExtractVoice, useUploadAudio, useVoiceStatus } from "@/features/finance/hooks/useVoice";
import {
  applyReceiptStatus,
  applyVoiceStatus,
  createDraftMessages,
  createUploadingMessage,
  extractionToDraftTransactions,
  getActiveReceiptIds,
  markMessageSent,
  mergeMessagesSorted,
  staleTrackedIds,
  updateMessageIfChanged,
} from "@/features/finance/utils/chatMessageUtils";
import type { ChatMessage, Message } from "@/features/finance/utils/chatMessageUtils";
import { persistPickedImage } from "@/features/finance/utils/persistPickedImage";
import { persistRecordedAudio } from "@/features/finance/utils/persistRecordedAudio";
import { clearPersistedMedia } from "@/features/finance/utils/persistToAppStorage";
import { useVoiceRecorder } from "@/hooks/useVoiceRecorder";
import { useIdTimeoutBackstop } from "@/hooks/useIdTimeoutBackstop";
import { generateId } from "@/lib/utils";

const STUCK_JOB_TIMEOUT_MS = 90_000;

interface UseMediaCaptureOptions {
  messages: Message[];
  setMessages: (updater: (prev: Message[]) => Message[]) => void;
  showToast: (message: string, type: "success" | "error") => void;
  sessionId: string | undefined;
  syncSessionId: (id: string) => void;
  defaultAccountId: string | undefined;
  t: TFunction;
}

export function useMediaCapture({
  messages,
  setMessages,
  showToast,
  sessionId,
  syncSessionId,
  defaultAccountId,
  t,
}: UseMediaCaptureOptions) {
  const uploadAudio = useUploadAudio();
  const extractVoice = useExtractVoice();
  const uploadReceipt = useUploadReceipt();
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

  const [voiceLogId, setVoiceLogId] = useState<string | null>(null);
  const [transcriptVisible, setTranscriptVisible] = useState(false);
  const receiptAccountIds = useRef<Map<string, string>>(new Map());
  const handledReceiptIds = useRef<Set<string>>(new Set());

  const voiceStatus = useVoiceStatus(voiceLogId);
  const activeReceiptIds = useMemo(() => getActiveReceiptIds(messages), [messages]);
  const receiptStatuses = useReceiptStatuses(activeReceiptIds);

  const voiceLogIdRef = useRef(voiceLogId);
  voiceLogIdRef.current = voiceLogId;
  const voiceStatusRef = useRef(voiceStatus);
  voiceStatusRef.current = voiceStatus;
  const receiptStatusesRef = useRef(receiptStatuses);
  receiptStatusesRef.current = receiptStatuses;

  useFocusEffect(
    useCallback(() => {
      if (voiceLogIdRef.current) void voiceStatusRef.current.refetch();
      receiptStatusesRef.current.forEach((query) => void query.refetch());
    }, [])
  );

  useEffect(() => {
    if (!recordingError) return;
    showToast(recordingError, "error");
    resetRecorder();
  }, [recordingError, resetRecorder, showToast]);

  useEffect(() => {
    if (!voiceLogId || !voiceStatus.data) return;
    setMessages((prev) =>
      prev.map((m) => (m.id === voiceLogId ? applyVoiceStatus(m as ChatMessage, voiceStatus.data!) : m))
    );
    if (voiceStatus.data.status === "transcribed") {
      resetRecorder();
      setTranscriptVisible(true);
    } else if (voiceStatus.data.status === "completed") {
      resetRecorder();
      setTranscriptVisible(false);
      const { extracted_data, transaction_ids } = voiceStatus.data;
      if (extracted_data.length > 0 && transaction_ids.length > 0 && defaultAccountId) {
        setMessages((prev) =>
          mergeMessagesSorted(
            prev,
            createDraftMessages(
              extractionToDraftTransactions(extracted_data, transaction_ids, defaultAccountId)
            )
          )
        );
      } else {
        showToast(t("ai.toast.noVoiceDraft"), "error");
      }
      setVoiceLogId(null);
    } else if (voiceStatus.data.status === "failed") {
      resetRecorder();
      setVoiceLogId(null);
      showToast(voiceStatus.data.error_message ?? t("ai.toast.voiceProcessingFailed"), "error");
    }
  }, [resetRecorder, setMessages, showToast, voiceLogId, voiceStatus.data, defaultAccountId, t]);

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
      const accountId = receiptAccountIds.current.get(id) ?? defaultAccountId;
      receiptAccountIds.current.delete(id);

      if (data.status === "completed") {
        const { extracted_data, transaction_ids } = data;
        if (extracted_data.length > 0 && transaction_ids.length > 0 && accountId) {
          setMessages((prev) =>
            mergeMessagesSorted(
              prev,
              createDraftMessages(
                extractionToDraftTransactions(extracted_data, transaction_ids, accountId)
              )
            )
          );
        } else {
          showToast(t("ai.toast.noReceiptDraft"), "error");
        }
      } else {
        showToast(data.error_message ?? t("ai.toast.receiptProcessingFailed"), "error");
      }
    });
  }, [setMessages, showToast, receiptStatuses, activeReceiptIds, defaultAccountId, t]);

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

  // Receipt/voice messages aren't restored from chat history, so any file
  // persisted last session is already orphaned by the time this hook mounts.
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

  const performVoiceUpload = useCallback(
    async (audioUri: string, accountId: string, placeholderId: string) => {
      try {
        const response = await uploadAudio.mutateAsync({
          audioUri,
          accountId,
          chatSessionId: sessionId,
        });
        void syncSessionId(response.chat_session_id);
        setMessages((prev) => markMessageSent(prev, placeholderId, response.voice_log_id));
        setVoiceLogId(response.voice_log_id);
      } catch {
        resetRecorder();
        setMessages((prev) =>
          updateMessageIfChanged(prev, placeholderId, (m) => ({
            ...m,
            status: "failed",
            errorMessage: t("ai.toast.voiceUploadFailed"),
          }))
        );
        showToast(t("ai.toast.voiceUploadFailed"), "error");
      }
    },
    [resetRecorder, setMessages, showToast, syncSessionId, sessionId, uploadAudio, t]
  );

  const performReceiptUpload = useCallback(
    async (imageUri: string, accountId: string, placeholderId: string) => {
      try {
        const response = await uploadReceipt.mutateAsync({
          imageUri,
          accountId,
          chatSessionId: sessionId,
        });
        void syncSessionId(response.chat_session_id);
        receiptAccountIds.current.set(response.receipt_log_id, accountId);
        setMessages((prev) => markMessageSent(prev, placeholderId, response.receipt_log_id));
      } catch {
        setMessages((prev) =>
          updateMessageIfChanged(prev, placeholderId, (m) => ({
            ...m,
            status: "failed",
            errorMessage: t("ai.toast.receiptUploadFailed"),
          }))
        );
        showToast(t("ai.toast.receiptUploadFailed"), "error");
      }
    },
    [setMessages, showToast, syncSessionId, sessionId, uploadReceipt, t]
  );

  const uploadVoiceFlow = useCallback(
    async (audioUri: string, accountId: string) => {
      const placeholderId = generateId();
      setMessages((prev) => [
        ...prev,
        createUploadingMessage({ id: placeholderId, type: "voice", localUri: audioUri, accountId }),
      ]);
      await performVoiceUpload(audioUri, accountId, placeholderId);
    },
    [performVoiceUpload, setMessages]
  );

  const uploadReceiptFlow = useCallback(
    async (imageUri: string, accountId: string) => {
      const placeholderId = generateId();
      setMessages((prev) => [
        ...prev,
        createUploadingMessage({ id: placeholderId, type: "receipt", localUri: imageUri, accountId }),
      ]);
      await performReceiptUpload(imageUri, accountId, placeholderId);
    },
    [performReceiptUpload, setMessages]
  );

  const handleRetry = useCallback(
    (message: ChatMessage) => {
      if (!message.localUri || !message.accountId) return;
      setMessages((prev) =>
        updateMessageIfChanged(prev, message.id, (m) => ({
          ...m,
          status: "uploading",
          errorMessage: undefined,
        }))
      );
      if (message.type === "voice") {
        void performVoiceUpload(message.localUri, message.accountId, message.id);
      } else {
        void performReceiptUpload(message.localUri, message.accountId, message.id);
      }
    },
    [performReceiptUpload, performVoiceUpload, setMessages]
  );

  const isMicBusy = recorderProcessing || uploadAudio.isPending || voiceLogId !== null;
  const isCameraBusy = uploadReceipt.isPending;

  const handleMicPressIn = useCallback(() => {
    if (isRecording) return;
    if (isMicBusy) {
      showToast(t("ai.toast.voiceStillProcessing"), "error");
      return;
    }
    if (!defaultAccountId) {
      showToast(t("transaction.noAccountsPrompt"), "error");
      return;
    }
    void startRecording();
  }, [defaultAccountId, isMicBusy, isRecording, showToast, startRecording, t]);

  const handleMicPressOut = useCallback(() => {
    if (!isRecording || !defaultAccountId) return;
    void (async () => {
      const audioUri = await stopRecording();
      if (!audioUri) return;
      const persistedUri = persistRecordedAudio(audioUri);
      await uploadVoiceFlow(persistedUri, defaultAccountId);
    })();
  }, [defaultAccountId, isRecording, stopRecording, uploadVoiceFlow]);

  const handleCameraPress = useCallback(async () => {
    if (!defaultAccountId) {
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
    await uploadReceiptFlow(persistedUri, defaultAccountId);
  }, [defaultAccountId, showToast, uploadReceiptFlow, t]);

  const handleTranscriptProcess = useCallback(
    (transcript: string) => {
      if (!voiceLogId) return;
      setTranscriptVisible(false);
      void extractVoice
        .mutateAsync({ voiceLogId, transcript, chatSessionId: sessionId })
        .catch(() => showToast(t("ai.toast.transcriptProcessFailed"), "error"));
    },
    [extractVoice, showToast, sessionId, voiceLogId, t]
  );

  const handleTranscriptDismiss = useCallback(() => {
    setTranscriptVisible(false);
    setVoiceLogId(null);
    setMessages((prev) => prev.filter((m) => m.id !== voiceLogId));
    resetRecorder();
  }, [resetRecorder, setMessages, voiceLogId]);

  return {
    isRecording,
    recordingDurationMs,
    isMicBusy,
    isCameraBusy,
    transcript: voiceStatus.data?.transcript ?? null,
    transcriptVisible,
    handleMicPressIn,
    handleMicPressOut,
    cancelRecording,
    handleCameraPress,
    handleRetry,
    handleTranscriptProcess,
    handleTranscriptDismiss,
  };
}
