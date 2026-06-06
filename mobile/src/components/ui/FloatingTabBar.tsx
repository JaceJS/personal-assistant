import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import * as ImagePicker from "expo-image-picker";
import { Building2, Camera, Home, Images, Mic, Settings, Square, Wallet } from "lucide-react-native";
import { useCallback, useMemo, useEffect, useState } from "react";
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ConfirmCard } from "@/components/voice/ConfirmCard";
import type { ConfirmPayload } from "@/components/voice/ConfirmCard";
import { RecordingIndicator } from "@/components/voice/RecordingIndicator";
import { TranscriptSheet } from "@/components/voice/TranscriptSheet";
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
import { useVoiceRecorder } from "@/hooks/useVoiceRecorder";
import { useToastStore } from "@/stores/toast";
import { colors, radius, textStyles } from "@/theme";
import { handleTabPress } from "./tabPressUtils";

const TAB_ICONS: Record<string, typeof Home> = {
  "(home)": Home,
  finance: Wallet,
  accounts: Building2,
  settings: Settings,
};

const TAB_LABELS: Record<string, string> = {
  "(home)": "Home",
  finance: "Finance",
  accounts: "Accounts",
  settings: "Settings",
};

export function FloatingTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const showToast = useToastStore((s) => s.showToast);
  const { data: accounts } = useAccounts();

  // Voice state
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
  const [voiceLogId, setVoiceLogId] = useState<string | null>(null);
  const [transcriptVisible, setTranscriptVisible] = useState(false);
  const [voiceConfirmVisible, setVoiceConfirmVisible] = useState(false);
  const voiceStatus = useVoiceStatus(voiceLogId);

  // Receipt state
  const uploadReceipt = useUploadReceipt();
  const confirmReceiptTransaction = useConfirmReceiptTransaction();
  const [receiptLogId, setReceiptLogId] = useState<string | null>(null);
  const [receiptConfirmVisible, setReceiptConfirmVisible] = useState(false);
  const receiptStatus = useReceiptStatus(receiptLogId);

  // Speed-dial state
  const [captureOptionsVisible, setCaptureOptionsVisible] = useState(false);

  const visibleRoutes = state.routes.filter((r) => TAB_ICONS[r.name]);
  const left = visibleRoutes.slice(0, 2);
  const right = visibleRoutes.slice(2);

  const activeAccounts = useMemo(
    () => accounts?.items.filter((a) => !a.is_archived) ?? [],
    [accounts]
  );
  const defaultAccount = activeAccounts[0] ?? null;

  // FAB blocks ONLY during recording or upload — NOT during background processing.
  const isFabBusy = recorderProcessing || uploadAudio.isPending || uploadReceipt.isPending;
  const showProcessingDot =
    (voiceLogId !== null &&
      voiceStatus.data?.status !== "completed" &&
      voiceStatus.data?.status !== "failed" &&
      voiceStatus.data?.status !== "transcribed" &&
      !transcriptVisible &&
      !voiceConfirmVisible) ||
    (receiptLogId !== null &&
      receiptStatus.data?.status !== "completed" &&
      receiptStatus.data?.status !== "failed" &&
      !receiptConfirmVisible);

  // Voice status transitions
  useEffect(() => {
    if (voiceStatus.data?.status === "transcribed") {
      resetRecorder();
      setTranscriptVisible(true);
    } else if (voiceStatus.data?.status === "completed") {
      resetRecorder();
      setTranscriptVisible(false);
      if (voiceStatus.data.extracted_data && voiceStatus.data.transaction_id) {
        setVoiceConfirmVisible(true);
      } else {
        setVoiceLogId(null);
        showToast("No draft transaction was created.", "error");
      }
    } else if (voiceStatus.data?.status === "failed") {
      resetRecorder();
      setVoiceLogId(null);
      showToast(voiceStatus.data.error_message ?? "Voice processing failed.", "error");
    }
  }, [resetRecorder, showToast, voiceStatus.data]);

  // Receipt status transitions
  useEffect(() => {
    if (receiptStatus.data?.status === "completed") {
      if (receiptStatus.data.extracted_data && receiptStatus.data.transaction_id) {
        setReceiptConfirmVisible(true);
      } else {
        setReceiptLogId(null);
        showToast("Could not extract transaction from receipt.", "error");
      }
    } else if (receiptStatus.data?.status === "failed") {
      setReceiptLogId(null);
      showToast(receiptStatus.data.error_message ?? "Receipt processing failed.", "error");
    }
  }, [showToast, receiptStatus.data]);

  const handleMicPressIn = useCallback(() => {
    if (isFabBusy || isRecording || captureOptionsVisible) return;
    if (!defaultAccount) {
      showToast("Create an account before recording a transaction.", "error");
      return;
    }
    void startRecording();
  }, [captureOptionsVisible, defaultAccount, isFabBusy, isRecording, showToast, startRecording]);

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
        setVoiceLogId(response.voice_log_id);
      } catch {
        resetRecorder();
        showToast("Could not upload voice recording.", "error");
      }
    })();
  }, [defaultAccount, isRecording, resetRecorder, showToast, stopRecording, uploadAudio]);

  const handleMicLongPress = useCallback(() => {
    if (isFabBusy || isRecording) return;
    setCaptureOptionsVisible(true);
  }, [isFabBusy, isRecording]);

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
      setReceiptLogId(response.receipt_log_id);
    } catch {
      showToast("Could not upload receipt.", "error");
    }
  }, [defaultAccount, showToast, uploadReceipt]);

  const handleGalleryPress = useCallback(async () => {
    if (!defaultAccount) {
      showToast("Create an account before scanning a receipt.", "error");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;
    const imageUri = result.assets[0].uri;
    try {
      const response = await uploadReceipt.mutateAsync({
        imageUri,
        accountId: defaultAccount.id,
      });
      setReceiptLogId(response.receipt_log_id);
    } catch {
      showToast("Could not upload receipt.", "error");
    }
  }, [defaultAccount, showToast, uploadReceipt]);

  const handleCancel = useCallback(() => {
    void cancelRecording();
  }, [cancelRecording]);

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
    resetRecorder();
  }, [resetRecorder]);

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

  const renderTab = (route: (typeof visibleRoutes)[0]) => {
    const focused = state.index === state.routes.indexOf(route);
    const Icon = TAB_ICONS[route.name];
    const label = TAB_LABELS[route.name];

    return (
      <Pressable
        key={route.key}
        onPress={() =>
          handleTabPress({
            focused,
            routeName: route.name,
            routeState: route.state as { key?: string; index?: number } | undefined,
            navigate: (name) => navigation.navigate(name),
            dispatch: (action) => navigation.dispatch(action),
          })
        }
        style={styles.tab}
        hitSlop={8}
      >
        <Icon
          size={22}
          color={focused ? colors.accent.primary : colors.text.muted}
          strokeWidth={focused ? 2.2 : 1.5}
        />
        <Text style={[styles.label, focused ? styles.labelActive : styles.labelInactive]}>
          {label}
        </Text>
      </Pressable>
    );
  };

  return (
    <View style={[styles.outer, { paddingBottom: insets.bottom + 8 }]}>
      {/* Speed-dial backdrop + menu */}
      {captureOptionsVisible && (
        <Modal transparent animationType="fade" onRequestClose={() => setCaptureOptionsVisible(false)}>
          <Pressable style={styles.backdrop} onPress={() => setCaptureOptionsVisible(false)}>
            <View style={styles.captureMenu}>
              <Pressable
                style={styles.captureOption}
                onPress={() => {
                  setCaptureOptionsVisible(false);
                  if (defaultAccount) void startRecording();
                  else showToast("Create an account first.", "error");
                }}
              >
                <Mic size={18} color={colors.accent.primary} strokeWidth={2} />
                <Text style={styles.captureLabel}>Voice</Text>
              </Pressable>
              <View style={styles.captureDivider} />
              <Pressable
                style={styles.captureOption}
                onPress={() => {
                  setCaptureOptionsVisible(false);
                  void handleCameraPress();
                }}
              >
                <Camera size={18} color={colors.accent.primary} strokeWidth={1.8} />
                <Text style={styles.captureLabel}>Camera</Text>
              </Pressable>
              <View style={styles.captureDivider} />
              <Pressable
                style={styles.captureOption}
                onPress={() => {
                  setCaptureOptionsVisible(false);
                  void handleGalleryPress();
                }}
              >
                <Images size={18} color={colors.accent.primary} strokeWidth={1.8} />
                <Text style={styles.captureLabel}>Library</Text>
              </Pressable>
            </View>
          </Pressable>
        </Modal>
      )}

      <View style={styles.fabWrap} pointerEvents="box-none">
        {isRecording && (
          <View style={styles.recordingWrap}>
            <RecordingIndicator isRecording={isRecording} onCancel={handleCancel} />
          </View>
        )}

        <Pressable
          onPressIn={handleMicPressIn}
          onPressOut={handleMicPressOut}
          onLongPress={handleMicLongPress}
          delayLongPress={400}
          disabled={isFabBusy && !isRecording}
          style={({ pressed }) => [
            styles.fabPressable,
            (isFabBusy && !isRecording) || pressed ? styles.fabDimmed : null,
          ]}
          hitSlop={10}
        >
          <View style={[styles.fab, isRecording && styles.fabRecording]}>
            {isFabBusy && !isRecording ? (
              <ActivityIndicator color={colors.accent.primary} />
            ) : isRecording ? (
              <Square size={24} color={colors.danger.text} fill={colors.danger.text} />
            ) : (
              <Mic size={26} color={colors.accent.primary} strokeWidth={2} />
            )}
          </View>
          {showProcessingDot && !isFabBusy && !isRecording && (
            <View style={styles.processingDot} />
          )}
        </Pressable>
      </View>

      <View style={styles.pill}>
        <View style={styles.side}>{left.map(renderTab)}</View>
        <View style={styles.gap} />
        <View style={styles.side}>{right.map(renderTab)}</View>
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
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    paddingHorizontal: 16,
  },
  fabWrap: {
    position: "absolute",
    top: -32,
    alignSelf: "center",
    zIndex: 10,
  },
  fabPressable: {
    width: 64,
    height: 64,
    borderRadius: radius.full,
  },
  fab: {
    width: 64,
    height: 64,
    borderRadius: radius.full,
    backgroundColor: "#E8E6FF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#7B6FE8",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  fabRecording: {
    backgroundColor: colors.danger.bg,
    borderWidth: 1,
    borderColor: `${colors.danger.text}80`,
  },
  fabDimmed: { opacity: 0.78 },
  processingDot: {
    position: "absolute",
    top: 2,
    right: 2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.accent.primary,
    borderWidth: 2,
    borderColor: colors.bg.canvas,
  },
  recordingWrap: {
    position: "absolute",
    bottom: 76,
    alignSelf: "center",
    backgroundColor: colors.bg.elevated,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  // Speed-dial
  backdrop: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
    paddingBottom: 120,
  },
  captureMenu: {
    flexDirection: "row",
    backgroundColor: colors.bg.elevated,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  captureOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  captureDivider: {
    width: 1,
    backgroundColor: colors.border.default,
  },
  captureLabel: {
    ...StyleSheet.flatten(textStyles.body),
    color: colors.text.primary,
  },
  // Tab bar pill
  pill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.bg.elevated,
    borderRadius: radius.full,
    width: "100%",
    paddingVertical: 10,
    paddingHorizontal: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  side: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-around",
  },
  gap: {
    width: 64,
  },
  tab: {
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    minWidth: 52,
    paddingVertical: 2,
  },
  label: {
    ...StyleSheet.flatten(textStyles.overline),
    fontSize: 10,
  },
  labelActive: {
    color: colors.accent.primary,
  },
  labelInactive: {
    color: colors.text.muted,
  },
});
