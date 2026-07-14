const mockGetSession = jest.fn();
const mockOnAuthStateChange = jest.fn();
const mockUnsubscribe = jest.fn();

jest.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      getSession: (...args: unknown[]) => mockGetSession(...args),
      onAuthStateChange: (...args: unknown[]) => mockOnAuthStateChange(...args),
    },
  },
}));
jest.mock("@/lib/logger", () => ({
  logger: { identifyUser: jest.fn(), resetUser: jest.fn(), error: jest.fn(), info: jest.fn() },
}));
jest.mock("@/lib/queryClient", () => ({ queryClient: { clear: jest.fn(), invalidateQueries: jest.fn() } }));
jest.mock("@/features/finance/repository", () => ({
  LocalRepository: jest.fn().mockImplementation(() => ({})),
}));

const mockGetLocalDataSummary = jest.fn();
jest.mock("@/features/sync/syncService", () => ({
  getLocalDataSummary: (...args: unknown[]) => mockGetLocalDataSummary(...args),
}));

import { renderHook, waitFor } from "@testing-library/react-native";
import { useAuthStore } from "@/stores/auth";
import { useSyncPromptStore } from "@/stores/syncPrompt";
import { useAuth } from "../useAuth";

const SUMMARY = { accounts: 1, transactions: 5, hasBudget: false, savingsGoals: 0 };
const SESSION = { user: { id: "user-1" } } as never;

function resetStores() {
  useAuthStore.setState({
    mode: "authenticated",
    isGuest: false,
    session: null,
    user: null,
    initialized: false,
  });
  useSyncPromptStore.setState({ phase: "idle", summary: null });
}

describe("useAuth: guest-data merge prompt", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetStores();
    mockOnAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: mockUnsubscribe } } });
  });

  it("shows the merge prompt on cold start when a session exists and local guest data is present", async () => {
    mockGetSession.mockResolvedValue({ data: { session: SESSION }, error: null });
    mockGetLocalDataSummary.mockResolvedValue(SUMMARY);

    renderHook(() => useAuth());

    await waitFor(() => expect(useSyncPromptStore.getState().phase).toBe("pending"));
    expect(useSyncPromptStore.getState().summary).toEqual(SUMMARY);
  });

  it("does not show the prompt on cold start when there is no local guest data", async () => {
    mockGetSession.mockResolvedValue({ data: { session: SESSION }, error: null });
    mockGetLocalDataSummary.mockResolvedValue(null);

    renderHook(() => useAuth());

    await waitFor(() => expect(useAuthStore.getState().initialized).toBe(true));
    expect(useSyncPromptStore.getState().phase).toBe("idle");
  });

  it("does not check for local data when there is no session (guest mode)", async () => {
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null });

    renderHook(() => useAuth());

    await waitFor(() => expect(useAuthStore.getState().mode).toBe("guest"));
    expect(mockGetLocalDataSummary).not.toHaveBeenCalled();
  });

  it("shows the prompt when a guest signs in and has local data (SIGNED_IN transition)", async () => {
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null });
    mockGetLocalDataSummary.mockResolvedValue(SUMMARY);
    renderHook(() => useAuth());
    await waitFor(() => expect(useAuthStore.getState().mode).toBe("guest"));

    const onChangeCallback = mockOnAuthStateChange.mock.calls[0][0] as (
      event: string,
      session: unknown
    ) => void;
    onChangeCallback("SIGNED_IN", SESSION);

    await waitFor(() => expect(useSyncPromptStore.getState().phase).toBe("pending"));
  });
});
