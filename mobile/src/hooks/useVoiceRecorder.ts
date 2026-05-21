import { useCallback, useRef } from "react";
import { AudioModule, RecordingPresets, useAudioRecorder } from "expo-audio";

import { useRecordingStore } from "@/stores/recording";

export function useVoiceRecorder() {
  const { phase, setPhase, setAudioUri, setError, reset } = useRecordingStore();
  const permissionGranted = useRef(false);
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (permissionGranted.current) return true;
    const { granted } = await AudioModule.requestRecordingPermissionsAsync();
    permissionGranted.current = granted;
    return granted;
  }, []);

  const startRecording = useCallback(async () => {
    const granted = await requestPermission();
    if (!granted) {
      setError("Izin mikrofon diperlukan untuk merekam suara.");
      return;
    }
    try {
      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();
      setPhase("recording");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memulai rekaman.");
    }
  }, [audioRecorder, requestPermission, setPhase, setError]);

  const stopRecording = useCallback(async (): Promise<string | null> => {
    if (phase !== "recording") return null;
    try {
      await audioRecorder.stop();
      const uri = audioRecorder.uri ?? null;
      setAudioUri(uri);
      setPhase("processing");
      return uri;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menghentikan rekaman.");
      return null;
    }
  }, [audioRecorder, phase, setAudioUri, setPhase, setError]);

  return {
    phase,
    isRecording: phase === "recording",
    isProcessing: phase === "processing",
    startRecording,
    stopRecording,
    reset,
  };
}
