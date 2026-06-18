import { create } from "zustand";

const MAX_QUEUE_SIZE = 20;
const MAX_RETRY_COUNT = 3;

type VoiceQueueStatus = "pending" | "uploading" | "failed";

export interface VoiceQueueItem {
  id: string;
  localUri: string;
  status: VoiceQueueStatus;
  retryCount: number;
  createdAt: number;
}

interface VoiceQueueState {
  queue: VoiceQueueItem[];
  isProcessing: boolean;
  enqueue: (localUri: string) => VoiceQueueItem;
  remove: (id: string) => void;
  markUploading: (id: string) => void;
  markFailed: (id: string) => void;
  getNextPending: () => VoiceQueueItem | null;
  setProcessing: (value: boolean) => void;
}

export const useVoiceQueueStore = create<VoiceQueueState>((set, get) => ({
  queue: [],
  isProcessing: false,

  enqueue: (localUri: string) => {
    const { queue } = get();
    if (queue.length >= MAX_QUEUE_SIZE) {
      throw new Error(`Voice queue full (max ${MAX_QUEUE_SIZE} items)`);
    }
    const item: VoiceQueueItem = {
      id: crypto.randomUUID(),
      localUri,
      status: "pending",
      retryCount: 0,
      createdAt: Date.now(),
    };
    set({ queue: [...queue, item] });
    return item;
  },

  remove: (id: string) => {
    set((s) => ({ queue: s.queue.filter((item) => item.id !== id) }));
  },

  markUploading: (id: string) => {
    set((s) => ({
      queue: s.queue.map((item) =>
        item.id === id ? { ...item, status: "uploading" as VoiceQueueStatus } : item
      ),
    }));
  },

  markFailed: (id: string) => {
    set((s) => {
      const updated = s.queue.map((item) =>
        item.id === id
          ? { ...item, status: "failed" as VoiceQueueStatus, retryCount: item.retryCount + 1 }
          : item
      );
      return { queue: updated.filter((item) => item.retryCount < MAX_RETRY_COUNT) };
    });
  },

  getNextPending: () => get().queue.find((item) => item.status === "pending") ?? null,

  setProcessing: (value: boolean) => set({ isProcessing: value }),
}));
