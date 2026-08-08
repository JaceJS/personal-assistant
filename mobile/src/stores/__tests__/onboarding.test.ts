jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

import AsyncStorage from "@react-native-async-storage/async-storage";
import { useOnboardingStore, type CoachmarkId } from "../onboarding";

const mockGetItem = AsyncStorage.getItem as jest.Mock;
const mockSetItem = AsyncStorage.setItem as jest.Mock;
const mockRemoveItem = AsyncStorage.removeItem as jest.Mock;

const ALL_HIDDEN = {
  bot: false,
  goal: false,
  homeAccount: false,
  homeTransaction: false,
  homeBudget: false,
  budget: false,
  addTransaction: false,
  aiChat: false,
} satisfies Record<CoachmarkId, boolean>;

function reset() {
  useOnboardingStore.setState({
    isComplete: false,
    initialized: false,
    guestName: "",
    dismissedCoachmarks: { ...ALL_HIDDEN },
  });
}

describe("onboarding store: isComplete", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    reset();
  });

  it("initialize reads storage key", async () => {
    mockGetItem.mockImplementation((key: string) => {
      if (key === "onboarding_v1_complete") return Promise.resolve("true");
      return Promise.resolve(null);
    });

    await useOnboardingStore.getState().initialize();

    expect(mockGetItem).toHaveBeenCalledWith("onboarding_v1_complete");
    expect(useOnboardingStore.getState().isComplete).toBe(true);
    expect(useOnboardingStore.getState().initialized).toBe(true);
  });

  it("null storage value treated as false", async () => {
    mockGetItem.mockResolvedValue(null);

    await useOnboardingStore.getState().initialize();

    expect(useOnboardingStore.getState().isComplete).toBe(false);
  });

  it("reset clears storage key and resets flag", async () => {
    mockRemoveItem.mockResolvedValue(undefined);
    useOnboardingStore.setState({ isComplete: true });

    await useOnboardingStore.getState().reset();

    expect(mockRemoveItem).toHaveBeenCalledWith("onboarding_v1_complete");
    expect(useOnboardingStore.getState().isComplete).toBe(false);
  });
});

describe("onboarding store: guestName", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    reset();
  });

  it("defaults guestName to empty string", () => {
    expect(useOnboardingStore.getState().guestName).toBe("");
  });

  it("initialize loads guestName from storage", async () => {
    mockGetItem.mockImplementation((key: string) => {
      if (key === "onboarding_v1_guest_name") return Promise.resolve("Jace");
      return Promise.resolve(null);
    });

    await useOnboardingStore.getState().initialize();

    expect(mockGetItem).toHaveBeenCalledWith("onboarding_v1_guest_name");
    expect(useOnboardingStore.getState().guestName).toBe("Jace");
  });

  it("null storage value treated as empty string", async () => {
    mockGetItem.mockResolvedValue(null);

    await useOnboardingStore.getState().initialize();

    expect(useOnboardingStore.getState().guestName).toBe("");
  });

  it("setGuestName persists name to storage and updates state", async () => {
    mockSetItem.mockResolvedValue(undefined);

    await useOnboardingStore.getState().setGuestName("Budi");

    expect(mockSetItem).toHaveBeenCalledWith("onboarding_v1_guest_name", "Budi");
    expect(useOnboardingStore.getState().guestName).toBe("Budi");
  });
});

describe("onboarding store: dismissedCoachmarks", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    reset();
  });

  it("defaults every coachmark to hidden", () => {
    expect(useOnboardingStore.getState().dismissedCoachmarks).toEqual(ALL_HIDDEN);
  });

  it("initialize loads dismissed state per coachmark from storage, preserving legacy keys", async () => {
    mockGetItem.mockImplementation((key: string) => {
      if (key === "onboarding_v1_bot_coachmark_dismissed") return Promise.resolve("true");
      if (key === "onboarding_v1_goal_coachmark_dismissed") return Promise.resolve("true");
      if (key === "onboarding_v1_coachmark_budget_dismissed") return Promise.resolve("true");
      return Promise.resolve(null);
    });

    await useOnboardingStore.getState().initialize();

    expect(mockGetItem).toHaveBeenCalledWith("onboarding_v1_bot_coachmark_dismissed");
    expect(mockGetItem).toHaveBeenCalledWith("onboarding_v1_goal_coachmark_dismissed");
    expect(useOnboardingStore.getState().dismissedCoachmarks).toEqual({
      ...ALL_HIDDEN,
      bot: true,
      goal: true,
      budget: true,
    });
  });

  it.each([
    ["bot", "onboarding_v1_bot_coachmark_dismissed"],
    ["goal", "onboarding_v1_goal_coachmark_dismissed"],
    ["homeAccount", "onboarding_v1_coachmark_homeAccount_dismissed"],
    ["homeTransaction", "onboarding_v1_coachmark_homeTransaction_dismissed"],
    ["homeBudget", "onboarding_v1_coachmark_homeBudget_dismissed"],
    ["budget", "onboarding_v1_coachmark_budget_dismissed"],
    ["addTransaction", "onboarding_v1_coachmark_addTransaction_dismissed"],
    ["aiChat", "onboarding_v1_coachmark_aiChat_dismissed"],
  ] satisfies [CoachmarkId, string][])(
    "dismissCoachmark(%s) persists to %s and updates only that entry",
    async (id, storageKey) => {
      mockSetItem.mockResolvedValue(undefined);

      await useOnboardingStore.getState().dismissCoachmark(id);

      expect(mockSetItem).toHaveBeenCalledWith(storageKey, "true");
      expect(useOnboardingStore.getState().dismissedCoachmarks).toEqual({
        ...ALL_HIDDEN,
        [id]: true,
      });
    }
  );
});
