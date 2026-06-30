import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";

const STORAGE_KEY = "onboarding_v1_complete";
const FIRST_RUN_KEY = "onboarding_v1_first_run_dismissed";

interface OnboardingState {
  isComplete: boolean;
  initialized: boolean;
  dismissedFirstRun: boolean;
  initialize: () => Promise<void>;
  complete: () => Promise<void>;
  reset: () => Promise<void>;
  dismissFirstRun: () => Promise<void>;
}

export const useOnboardingStore = create<OnboardingState>((set) => ({
  isComplete: false,
  initialized: false,
  dismissedFirstRun: false,

  initialize: async () => {
    try {
      const [complete, dismissed] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEY),
        AsyncStorage.getItem(FIRST_RUN_KEY),
      ]);
      set({ isComplete: complete === "true", dismissedFirstRun: dismissed === "true", initialized: true });
    } catch {
      set({ isComplete: false, dismissedFirstRun: false, initialized: true });
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
}));
