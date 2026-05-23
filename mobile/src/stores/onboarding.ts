import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";

const STORAGE_KEY = "onboarding_v1_complete";

interface OnboardingState {
  isComplete: boolean;
  initialized: boolean;
  initialize: () => Promise<void>;
  complete: () => Promise<void>;
  reset: () => Promise<void>;
}

export const useOnboardingStore = create<OnboardingState>((set) => ({
  isComplete: false,
  initialized: false,

  initialize: async () => {
    const value = await AsyncStorage.getItem(STORAGE_KEY);
    set({ isComplete: value === "true", initialized: true });
  },

  complete: async () => {
    await AsyncStorage.setItem(STORAGE_KEY, "true");
    set({ isComplete: true });
  },

  reset: async () => {
    await AsyncStorage.removeItem(STORAGE_KEY);
    set({ isComplete: false });
  },
}));
