import { create } from "zustand";

export type RecordingPhase = "idle" | "recording" | "processing" | "error";

interface RecordingState {
  phase: RecordingPhase;
  audioUri: string | null;
  errorMessage: string | null;
  setPhase: (phase: RecordingPhase) => void;
  setAudioUri: (uri: string | null) => void;
  setError: (message: string) => void;
  reset: () => void;
}

export const useRecordingStore = create<RecordingState>((set) => ({
  phase: "idle",
  audioUri: null,
  errorMessage: null,
  setPhase: (phase) => set({ phase, errorMessage: null }),
  setAudioUri: (audioUri) => set({ audioUri }),
  setError: (errorMessage) => set({ phase: "error", errorMessage }),
  reset: () => set({ phase: "idle", audioUri: null, errorMessage: null }),
}));
