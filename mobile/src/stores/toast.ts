import { create } from "zustand";

export type ToastType = "success" | "error" | "info" | "warning";

interface QueuedToast {
  message: string;
  type: ToastType;
}

interface ToastState {
  message: string;
  type: ToastType;
  visible: boolean;
  queue: QueuedToast[];
  showToast: (message: string, type?: ToastType) => void;
  hideToast: () => void;
}

const TOAST_DURATION_MS = 3000;

let hideTimer: ReturnType<typeof setTimeout> | null = null;

function clearHideTimer(): void {
  if (hideTimer) {
    clearTimeout(hideTimer);
    hideTimer = null;
  }
}

export const useToastStore = create<ToastState>((set, get) => {
  function display(toast: QueuedToast): void {
    clearHideTimer();
    set({ message: toast.message, type: toast.type, visible: true });
    hideTimer = setTimeout(advance, TOAST_DURATION_MS);
  }

  function advance(): void {
    hideTimer = null;
    const [next, ...rest] = get().queue;
    if (next) {
      set({ queue: rest });
      display(next);
    } else {
      set({ visible: false });
    }
  }

  return {
    message: "",
    type: "info",
    visible: false,
    queue: [],

    // A toast already showing must finish before the next one takes over, so
    // concurrent completions (e.g. two receipts finishing in the same tick)
    // don't clobber each other.
    showToast: (message, type = "info") => {
      if (get().visible) {
        set((s) => ({ queue: [...s.queue, { message, type }] }));
        return;
      }
      display({ message, type });
    },

    hideToast: () => {
      clearHideTimer();
      advance();
    },
  };
});
