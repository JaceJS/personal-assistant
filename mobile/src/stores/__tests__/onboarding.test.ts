jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

import AsyncStorage from "@react-native-async-storage/async-storage";
import { useOnboardingStore } from "../onboarding";

const mockGetItem = AsyncStorage.getItem as jest.Mock;
const mockSetItem = AsyncStorage.setItem as jest.Mock;
const mockRemoveItem = AsyncStorage.removeItem as jest.Mock;

function reset() {
  useOnboardingStore.setState({
    isComplete: false,
    initialized: false,
    dismissedFirstRun: false,
    guestName: "",
    dismissedBotCoachmark: false,
  });
}

describe("onboarding store: dismissedFirstRun", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    reset();
  });

  it("defaults dismissedFirstRun to false", () => {
    expect(useOnboardingStore.getState().dismissedFirstRun).toBe(false);
  });

  it("initialize reads both storage keys in parallel", async () => {
    mockGetItem.mockImplementation((key: string) => {
      if (key === "onboarding_v1_complete") return Promise.resolve("true");
      if (key === "onboarding_v1_first_run_dismissed") return Promise.resolve("true");
      return Promise.resolve(null);
    });

    await useOnboardingStore.getState().initialize();

    expect(mockGetItem).toHaveBeenCalledWith("onboarding_v1_complete");
    expect(mockGetItem).toHaveBeenCalledWith("onboarding_v1_first_run_dismissed");
    expect(useOnboardingStore.getState().isComplete).toBe(true);
    expect(useOnboardingStore.getState().dismissedFirstRun).toBe(true);
    expect(useOnboardingStore.getState().initialized).toBe(true);
  });

  it("null storage values treated as false", async () => {
    mockGetItem.mockResolvedValue(null);

    await useOnboardingStore.getState().initialize();

    expect(useOnboardingStore.getState().isComplete).toBe(false);
    expect(useOnboardingStore.getState().dismissedFirstRun).toBe(false);
  });

  it("dismissFirstRun persists flag to storage and updates state", async () => {
    mockSetItem.mockResolvedValue(undefined);

    await useOnboardingStore.getState().dismissFirstRun();

    expect(mockSetItem).toHaveBeenCalledWith("onboarding_v1_first_run_dismissed", "true");
    expect(useOnboardingStore.getState().dismissedFirstRun).toBe(true);
  });

  it("reset clears both storage keys and resets both flags", async () => {
    mockRemoveItem.mockResolvedValue(undefined);
    useOnboardingStore.setState({ isComplete: true, dismissedFirstRun: true });

    await useOnboardingStore.getState().reset();

    expect(mockRemoveItem).toHaveBeenCalledWith("onboarding_v1_complete");
    expect(mockRemoveItem).toHaveBeenCalledWith("onboarding_v1_first_run_dismissed");
    expect(useOnboardingStore.getState().isComplete).toBe(false);
    expect(useOnboardingStore.getState().dismissedFirstRun).toBe(false);
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

describe("onboarding store: dismissedBotCoachmark", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    reset();
  });

  it("defaults dismissedBotCoachmark to false", () => {
    expect(useOnboardingStore.getState().dismissedBotCoachmark).toBe(false);
  });

  it("initialize loads dismissedBotCoachmark from storage", async () => {
    mockGetItem.mockImplementation((key: string) => {
      if (key === "onboarding_v1_bot_coachmark_dismissed") return Promise.resolve("true");
      return Promise.resolve(null);
    });

    await useOnboardingStore.getState().initialize();

    expect(mockGetItem).toHaveBeenCalledWith("onboarding_v1_bot_coachmark_dismissed");
    expect(useOnboardingStore.getState().dismissedBotCoachmark).toBe(true);
  });

  it("dismissBotCoachmark persists flag to storage and updates state", async () => {
    mockSetItem.mockResolvedValue(undefined);

    await useOnboardingStore.getState().dismissBotCoachmark();

    expect(mockSetItem).toHaveBeenCalledWith("onboarding_v1_bot_coachmark_dismissed", "true");
    expect(useOnboardingStore.getState().dismissedBotCoachmark).toBe(true);
  });
});
