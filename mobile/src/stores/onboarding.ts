import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";

const STORAGE_KEY = "onboarding_v1_complete";
const GUEST_NAME_KEY = "onboarding_v1_guest_name";

export type CoachmarkId =
  | "bot"
  | "goal"
  | "homeAccount"
  | "homeTransaction"
  | "homeBudget"
  | "budget"
  | "addTransaction"
  | "aiChat";

const COACHMARK_STORAGE_KEYS: Record<CoachmarkId, string> = {
  bot: "onboarding_v1_bot_coachmark_dismissed",
  goal: "onboarding_v1_goal_coachmark_dismissed",
  homeAccount: "onboarding_v1_coachmark_homeAccount_dismissed",
  homeTransaction: "onboarding_v1_coachmark_homeTransaction_dismissed",
  homeBudget: "onboarding_v1_coachmark_homeBudget_dismissed",
  budget: "onboarding_v1_coachmark_budget_dismissed",
  addTransaction: "onboarding_v1_coachmark_addTransaction_dismissed",
  aiChat: "onboarding_v1_coachmark_aiChat_dismissed",
};

const COACHMARK_IDS = Object.keys(COACHMARK_STORAGE_KEYS) as CoachmarkId[];

function allCoachmarksHidden(): Record<CoachmarkId, boolean> {
  return Object.fromEntries(COACHMARK_IDS.map((id) => [id, false])) as Record<CoachmarkId, boolean>;
}

interface OnboardingState {
  isComplete: boolean;
  initialized: boolean;
  guestName: string;
  dismissedCoachmarks: Record<CoachmarkId, boolean>;
  initialize: () => Promise<void>;
  complete: () => Promise<void>;
  reset: () => Promise<void>;
  setGuestName: (name: string) => Promise<void>;
  dismissCoachmark: (id: CoachmarkId) => Promise<void>;
}

export const useOnboardingStore = create<OnboardingState>((set) => ({
  isComplete: false,
  initialized: false,
  guestName: "",
  dismissedCoachmarks: allCoachmarksHidden(),

  initialize: async () => {
    try {
      const [complete, guestName, coachmarkValues] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEY),
        AsyncStorage.getItem(GUEST_NAME_KEY),
        Promise.all(COACHMARK_IDS.map((id) => AsyncStorage.getItem(COACHMARK_STORAGE_KEYS[id]))),
      ]);
      const dismissedCoachmarks = Object.fromEntries(
        COACHMARK_IDS.map((id, i) => [id, coachmarkValues[i] === "true"])
      ) as Record<CoachmarkId, boolean>;
      set({
        isComplete: complete === "true",
        guestName: guestName ?? "",
        dismissedCoachmarks,
        initialized: true,
      });
    } catch {
      set({
        isComplete: false,
        guestName: "",
        dismissedCoachmarks: allCoachmarksHidden(),
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

  dismissCoachmark: async (id: CoachmarkId) => {
    await AsyncStorage.setItem(COACHMARK_STORAGE_KEYS[id], "true");
    set((s) => ({ dismissedCoachmarks: { ...s.dismissedCoachmarks, [id]: true } }));
  },
}));
