import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Building2, Home, Mic, Settings, Square, Wallet } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ConfirmCard } from "@/components/voice/ConfirmCard";
import type { ConfirmPayload } from "@/components/voice/ConfirmCard";
import { RecordingIndicator } from "@/components/voice/RecordingIndicator";
import { useAccounts } from "@/features/finance/hooks/useAccounts";
import {
  useConfirmVoiceTransaction,
  useUploadAudio,
  useVoiceStatus,
} from "@/features/finance/hooks/useVoice";
import { useVoiceRecorder } from "@/hooks/useVoiceRecorder";
import { useToastStore } from "@/stores/toast";
import { colors, radius, textStyles } from "@/theme";

const TAB_ICONS: Record<string, typeof Home> = {
  index: Home,
  finance: Wallet,
  accounts: Building2,
  settings: Settings,
};

const TAB_LABELS: Record<string, string> = {
  index: "Home",
  finance: "Finance",
  accounts: "Accounts",
  settings: "Settings",
};

export function FloatingTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const showToast = useToastStore((s) => s.showToast);
  const { data: accounts } = useAccounts();
  const uploadAudio = useUploadAudio();
  const confirmTransaction = useConfirmVoiceTransaction();
  const {
    isRecording,
    isProcessing: recorderProcessing,
    startRecording,
    stopRecording,
    reset,
  } = useVoiceRecorder();
  const [voiceLogId, setVoiceLogId] = useState<string | null>(null);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const voiceStatus = useVoiceStatus(voiceLogId);
  const visibleRoutes = state.routes.filter((r) => TAB_ICONS[r.name]);

  const left = visibleRoutes.slice(0, 2);
  const right = visibleRoutes.slice(2);
  const defaultAccount = useMemo(
    () => accounts?.items.find((account) => !account.is_archived) ?? null,
    [accounts]
  );
  const isVoiceFinished =
    voiceStatus.data?.status === "completed" || voiceStatus.data?.status === "failed";
  const isVoiceBusy =
    recorderProcessing ||
    uploadAudio.isPending ||
    (voiceLogId !== null && !isVoiceFinished);

  useEffect(() => {
    if (voiceStatus.data?.status === "completed") {
      reset();
      if (voiceStatus.data.extracted_data && voiceStatus.data.transaction_id) {
        setConfirmVisible(true);
      } else {
        setVoiceLogId(null);
        showToast("No draft transaction was created.", "error");
      }
    }
    if (voiceStatus.data?.status === "failed") {
      reset();
      setVoiceLogId(null);
      showToast(voiceStatus.data.error_message ?? "Voice processing failed.", "error");
    }
  }, [reset, showToast, voiceStatus.data]);

  const handleMicPressIn = useCallback(() => {
    if (isVoiceBusy || isRecording) return;
    if (!defaultAccount) {
      showToast("Create an account before recording a transaction.", "error");
      return;
    }
    void startRecording();
  }, [defaultAccount, isRecording, isVoiceBusy, showToast, startRecording]);

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
        reset();
        showToast("Could not upload voice recording.", "error");
      }
    })();
  }, [defaultAccount, isRecording, reset, showToast, stopRecording, uploadAudio]);

  const handleConfirm = useCallback(
    (payload: ConfirmPayload) => {
      const transactionId = voiceStatus.data?.transaction_id;
      if (!transactionId) {
        showToast("No draft transaction was created.", "error");
        return;
      }
      void confirmTransaction.mutateAsync({ transactionId, ...payload }).then(
        () => {
          setConfirmVisible(false);
          setVoiceLogId(null);
          reset();
          showToast("Transaction saved.", "success");
        },
        () => showToast("Could not save transaction.", "error")
      );
    },
    [confirmTransaction, reset, showToast, voiceStatus.data?.transaction_id]
  );

  const handleDismissConfirm = useCallback(() => {
    setConfirmVisible(false);
    setVoiceLogId(null);
    reset();
  }, [reset]);

  const renderTab = (route: (typeof visibleRoutes)[0]) => {
    const focused = state.index === state.routes.indexOf(route);
    const Icon = TAB_ICONS[route.name];
    const label = TAB_LABELS[route.name];

    return (
      <Pressable
        key={route.key}
        onPress={() => navigation.navigate(route.name)}
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
      <View style={styles.fabWrap} pointerEvents="box-none">
        {isRecording && (
          <View style={styles.recordingWrap}>
            <RecordingIndicator isRecording={isRecording} />
          </View>
        )}
        <Pressable
          onPressIn={handleMicPressIn}
          onPressOut={handleMicPressOut}
          disabled={isVoiceBusy && !isRecording}
          style={({ pressed }) => [
            styles.fabPressable,
            (isVoiceBusy && !isRecording) || pressed ? styles.fabDimmed : null,
          ]}
          hitSlop={10}
        >
          <View style={[styles.fab, isRecording && styles.fabRecording]}>
            {isVoiceBusy && !isRecording ? (
              <ActivityIndicator color={colors.accent.primary} />
            ) : isRecording ? (
              <Square size={24} color={colors.danger.text} fill={colors.danger.text} />
            ) : (
              <Mic size={26} color={colors.accent.primary} strokeWidth={2} />
            )}
          </View>
        </Pressable>
      </View>

      <View style={styles.pill}>
        <View style={styles.side}>{left.map(renderTab)}</View>
        <View style={styles.gap} />
        <View style={styles.side}>{right.map(renderTab)}</View>
      </View>

      <ConfirmCard
        data={voiceStatus.data?.extracted_data ?? null}
        isVisible={confirmVisible}
        isSaving={confirmTransaction.isPending}
        onSave={handleConfirm}
        onDismiss={handleDismissConfirm}
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
