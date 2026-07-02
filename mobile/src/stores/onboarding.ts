import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";

const STORAGE_KEY = "onboarding_v1_complete";
const FIRST_RUN_KEY = "onboarding_v1_first_run_dismissed";
const GUEST_NAME_KEY = "onboarding_v1_guest_name";
const BOT_COACHMARK_KEY = "onboarding_v1_bot_coachmark_dismissed";

interface OnboardingState {
  isComplete: boolean;
  initialized: boolean;
  dismissedFirstRun: boolean;
  guestName: string;
  dismissedBotCoachmark: boolean;
  initialize: () => Promise<void>;
  complete: () => Promise<void>;
  reset: () => Promise<void>;
  dismissFirstRun: () => Promise<void>;
  setGuestName: (name: string) => Promise<void>;
  dismissBotCoachmark: () => Promise<void>;
}

export const useOnboardingStore = create<OnboardingState>((set) => ({
  isComplete: false,
  initialized: false,
  dismissedFirstRun: false,
  guestName: "",
  dismissedBotCoachmark: false,

  initialize: async () => {
    try {
      const [complete, dismissed, guestName, botCoachmarkDismissed] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEY),
        AsyncStorage.getItem(FIRST_RUN_KEY),
        AsyncStorage.getItem(GUEST_NAME_KEY),
        AsyncStorage.getItem(BOT_COACHMARK_KEY),
      ]);
      set({
        isComplete: complete === "true",
        dismissedFirstRun: dismissed === "true",
        guestName: guestName ?? "",
        dismissedBotCoachmark: botCoachmarkDismissed === "true",
        initialized: true,
      });
    } catch {
      set({
        isComplete: false,
        dismissedFirstRun: false,
        guestName: "",
        dismissedBotCoachmark: false,
        initialized: true,
      });
    }
  },

  complete: async () => {
    await AsyncStorage.setItem(STORAGE_KEY, "true");
    set({ isComplete: true });
  },

  reset: async () => {
    await Promise.all([
      AsyncStorage.removeItem(STORAGE_KEY),
      AsyncStorage.removeItem(FIRST_RUN_KEY),
    ]);
    set({ isComplete: false, dismissedFirstRun: false });
  },

  dismissFirstRun: async () => {
    await AsyncStorage.setItem(FIRST_RUN_KEY, "true");
    set({ dismissedFirstRun: true });
  },

  setGuestName: async (name: string) => {
    await AsyncStorage.setItem(GUEST_NAME_KEY, name);
    set({ guestName: name });
  },

  dismissBotCoachmark: async () => {
    await AsyncStorage.setItem(BOT_COACHMARK_KEY, "true");
    set({ dismissedBotCoachmark: true });
  },
}));
