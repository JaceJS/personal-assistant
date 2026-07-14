import { create } from "zustand";
import type { LocalDataSummary } from "@/features/sync/syncService";

type SyncPromptPhase = "idle" | "pending" | "syncing" | "error";

interface SyncPromptState {
  phase: SyncPromptPhase;
  summary: LocalDataSummary | null;
  showPrompt: (summary: LocalDataSummary) => void;
  startSyncing: () => void;
  syncSucceeded: () => void;
  syncFailed: () => void;
  dismiss: () => void;
}

export const useSyncPromptStore = create<SyncPromptState>((set) => ({
  phase: "idle",
  summary: null,
  showPrompt: (summary) => set({ phase: "pending", summary }),
  startSyncing: () => set({ phase: "syncing" }),
  syncSucceeded: () => set({ phase: "idle", summary: null }),
  syncFailed: () => set({ phase: "error" }),
  dismiss: () => set({ phase: "idle", summary: null }),
}));
