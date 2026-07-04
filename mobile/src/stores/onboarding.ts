import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";

const STORAGE_KEY = "onboarding_v1_complete";
const GUEST_NAME_KEY = "onboarding_v1_guest_name";
const BOT_COACHMARK_KEY = "onboarding_v1_bot_coachmark_dismissed";
const GOAL_COACHMARK_KEY = "onboarding_v1_goal_coachmark_dismissed";

interface OnboardingState {
  isComplete: boolean;
  initialized: boolean;
  guestName: string;
  dismissedBotCoachmark: boolean;
  dismissedGoalCoachmark: boolean;
  initialize: () => Promise<void>;
  complete: () => Promise<void>;
  reset: () => Promise<void>;
  setGuestName: (name: string) => Promise<void>;
  dismissBotCoachmark: () => Promise<void>;
  dismissGoalCoachmark: () => Promise<void>;
}

export const useOnboardingStore = create<OnboardingState>((set) => ({
  isComplete: false,
  initialized: false,
  guestName: "",
  dismissedBotCoachmark: false,
  dismissedGoalCoachmark: false,

  initialize: async () => {
    try {
      const [complete, guestName, botCoachmarkDismissed, goalCoachmarkDismissed] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEY),
        AsyncStorage.getItem(GUEST_NAME_KEY),
        AsyncStorage.getItem(BOT_COACHMARK_KEY),
        AsyncStorage.getItem(GOAL_COACHMARK_KEY),
      ]);
      set({
        isComplete: complete === "true",
        guestName: guestName ?? "",
        dismissedBotCoachmark: botCoachmarkDismissed === "true",
        dismissedGoalCoachmark: goalCoachmarkDismissed === "true",
        initialized: true,
      });
    } catch {
      set({
        isComplete: false,
        guestName: "",
        dismissedBotCoachmark: false,
        dismissedGoalCoachmark: false,
        initialized: true,
      });
    }
  },

  complete: async () => {
    await AsyncStorage.setItem(STORAGE_KEY, "true");
    set({ isComplete: true });
  },

  reset: async () => {
    await AsyncStorage.removeItem(STORAGE_KEY);
    set({ isComplete: false });
  },

  setGuestName: async (name: string) => {
    await AsyncStorage.setItem(GUEST_NAME_KEY, name);
    set({ guestName: name });
  },

  dismissBotCoachmark: async () => {
    await AsyncStorage.setItem(BOT_COACHMARK_KEY, "true");
    set({ dismissedBotCoachmark: true });
  },

  dismissGoalCoachmark: async () => {
    await AsyncStorage.setItem(GOAL_COACHMARK_KEY, "true");
    set({ dismissedGoalCoachmark: true });
  },
}));
