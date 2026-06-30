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
