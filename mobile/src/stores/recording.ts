import { create } from "zustand";

export type RecordingPhase = "idle" | "recording" | "processing" | "error";

interface RecordingState {
  phase: RecordingPhase;
  audioUri: string | null;
  errorMessage: string | null;
  durationMs: number;
  setPhase: (phase: RecordingPhase) => void;
  setAudioUri: (uri: string | null) => void;
  setError: (message: string) => void;
  setDurationMs: (durationMs: number) => void;
  reset: () => void;
}

export const useRecordingStore = create<RecordingState>((set) => ({
  phase: "idle",
  audioUri: null,
  errorMessage: null,
  durationMs: 0,
  setPhase: (phase) =>
    set((state) => ({
      phase,
      errorMessage: null,
      durationMs: phase === "recording" ? 0 : state.durationMs,
    })),
  setAudioUri: (audioUri) => set({ audioUri }),
  setError: (errorMessage) => set({ phase: "error", errorMessage }),
  setDurationMs: (durationMs) => set({ durationMs }),
  reset: () => set({ phase: "idle", audioUri: null, errorMessage: null, durationMs: 0 }),
}));
