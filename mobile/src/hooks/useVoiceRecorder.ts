import { useCallback, useEffect, useRef } from "react";
import { AudioModule, RecordingPresets, useAudioRecorder } from "expo-audio";
import * as Haptics from "expo-haptics";
import { useTranslation } from "react-i18next";

import { isRecordingTooShort } from "@/features/finance/utils/recordingUtils";
import { logger } from "@/lib/logger";
import { useRecordingStore } from "@/stores/recording";

const DURATION_TICK_MS = 250;

export function useVoiceRecorder() {
  const { t } = useTranslation();
  const { phase, errorMessage, durationMs, setPhase, setAudioUri, setError, setDurationMs, reset } =
    useRecordingStore();
  const permissionGranted = useRef(false);
  const startedAtRef = useRef(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  const stopTicking = useCallback(() => {
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
  }, []);

  useEffect(() => stopTicking, [stopTicking]);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (permissionGranted.current) return true;
    const { granted } = await AudioModule.requestRecordingPermissionsAsync();
    permissionGranted.current = granted;
    return granted;
  }, []);

  const startRecording = useCallback(async () => {
    const granted = await requestPermission();
    if (!granted) {
      setError(t("ai.recording.micPermissionRequired"));
      return;
    }
    try {
      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();
      startedAtRef.current = Date.now();
      setPhase("recording");
      stopTicking();
      tickRef.current = setInterval(
        () => setDurationMs(Date.now() - startedAtRef.current),
        DURATION_TICK_MS
      );
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (e) {
      logger.error("startRecording failed", e);
      setError(t("ai.recording.startFailed"));
    }
  }, [audioRecorder, requestPermission, setDurationMs, setPhase, setError, stopTicking, t]);

  const stopRecording = useCallback(async (): Promise<string | null> => {
    if (phase !== "recording") return null;
    stopTicking();
    const elapsedMs = Date.now() - startedAtRef.current;
    try {
      await audioRecorder.stop();
    } catch (e) {
      logger.error("stopRecording failed", e);
      setError(t("ai.recording.stopFailed"));
      return null;
    }
    if (isRecordingTooShort(elapsedMs)) {
      setError(t("ai.recording.tooShort"));
      return null;
    }
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const uri = audioRecorder.uri ?? null;
    setAudioUri(uri);
    setPhase("processing");
    return uri;
  }, [audioRecorder, phase, setAudioUri, setPhase, setError, stopTicking, t]);

  const cancelRecording = useCallback(async () => {
    if (phase !== "recording") return;
    stopTicking();
    try {
      await audioRecorder.stop();
    } catch {
      // ignore, we're discarding the recording anyway
    }
    reset();
  }, [audioRecorder, phase, reset, stopTicking]);

  return {
    phase,
    isRecording: phase === "recording",
    isProcessing: phase === "processing",
    durationMs,
    errorMessage,
    startRecording,
    stopRecording,
    cancelRecording,
    reset,
  };
}
