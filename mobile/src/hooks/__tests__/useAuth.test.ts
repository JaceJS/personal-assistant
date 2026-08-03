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
jest.mock("@/features/ai/hooks/useChat", () => ({ CHAT_SESSION_KEY: "chat_session_id" }));

const mockAsyncStorageRemoveItem = jest.fn();
jest.mock("@react-native-async-storage/async-storage", () => ({
  removeItem: (...args: unknown[]) => mockAsyncStorageRemoveItem(...args),
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

describe("useAuth: query cache invalidation on identity change", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetStores();
    mockOnAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: mockUnsubscribe } } });
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null });
    mockGetLocalDataSummary.mockResolvedValue(null);
  });

  // Cold-start's own getSession()->enterGuestMode() resolves asynchronously
  // and would otherwise clobber whatever "previous identity" a test seeds
  // before firing the change — so mount and let it settle first, THEN seed
  // the previous identity, THEN fire the onAuthStateChange callback.
  async function fireAuthChange(
    previousState: Partial<ReturnType<typeof useAuthStore.getState>>,
    event: string,
    session: unknown
  ) {
    renderHook(() => useAuth());
    await waitFor(() => expect(useAuthStore.getState().initialized).toBe(true));
    useAuthStore.setState(previousState);
    const onChangeCallback = mockOnAuthStateChange.mock.calls[0][0] as (
      event: string,
      session: unknown
    ) => void;
    onChangeCallback(event, session);
  }

  function getMockQueryClient() {
    return (jest.requireMock("@/lib/queryClient") as { queryClient: { clear: jest.Mock } })
      .queryClient;
  }

  it("clears the query cache when a guest signs in", async () => {
    await fireAuthChange({ isGuest: true, session: null, mode: "guest" }, "SIGNED_IN", SESSION);

    expect(getMockQueryClient().clear).toHaveBeenCalled();
  });

  it("clears the query cache when switching to a different authenticated user", async () => {
    await fireAuthChange(
      { isGuest: false, mode: "authenticated", session: { user: { id: "user-1" } } as never },
      "SIGNED_IN",
      { user: { id: "user-2" } }
    );

    expect(getMockQueryClient().clear).toHaveBeenCalled();
  });

  it("does not clear the query cache on a token refresh for the same user", async () => {
    await fireAuthChange(
      { isGuest: false, mode: "authenticated", session: { user: { id: "user-1" } } as never },
      "TOKEN_REFRESHED",
      { user: { id: "user-1" } }
    );

    expect(getMockQueryClient().clear).not.toHaveBeenCalled();
  });

  it("clears the query cache when a previously authenticated session is lost", async () => {
    await fireAuthChange(
      { isGuest: false, mode: "authenticated", session: { user: { id: "user-1" } } as never },
      "SIGNED_OUT",
      null
    );

    expect(getMockQueryClient().clear).toHaveBeenCalled();
  });

  it("does not clear the query cache when already guest and staying guest", async () => {
    await fireAuthChange({ isGuest: true, mode: "guest", session: null }, "SIGNED_OUT", null);

    expect(getMockQueryClient().clear).not.toHaveBeenCalled();
  });
});

describe("useAuth: chat session cache on identity change", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetStores();
    mockOnAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: mockUnsubscribe } } });
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null });
    mockGetLocalDataSummary.mockResolvedValue(null);
  });

  async function fireAuthChange(
    previousState: Partial<ReturnType<typeof useAuthStore.getState>>,
    event: string,
    session: unknown
  ) {
    renderHook(() => useAuth());
    await waitFor(() => expect(useAuthStore.getState().initialized).toBe(true));
    useAuthStore.setState(previousState);
    const onChangeCallback = mockOnAuthStateChange.mock.calls[0][0] as (
      event: string,
      session: unknown
    ) => void;
    onChangeCallback(event, session);
  }

  it("clears the chat session key when switching to a different authenticated user", async () => {
    await fireAuthChange(
      { isGuest: false, mode: "authenticated", session: { user: { id: "user-1" } } as never },
      "SIGNED_IN",
      { user: { id: "user-2" } }
    );

    expect(mockAsyncStorageRemoveItem).toHaveBeenCalledWith("chat_session_id");
  });

  it("clears the chat session key when a guest signs in", async () => {
    await fireAuthChange({ isGuest: true, session: null, mode: "guest" }, "SIGNED_IN", SESSION);

    expect(mockAsyncStorageRemoveItem).toHaveBeenCalledWith("chat_session_id");
  });

  it("does not clear the chat session key on a token refresh for the same user", async () => {
    await fireAuthChange(
      { isGuest: false, mode: "authenticated", session: { user: { id: "user-1" } } as never },
      "TOKEN_REFRESHED",
      { user: { id: "user-1" } }
    );

    expect(mockAsyncStorageRemoveItem).not.toHaveBeenCalled();
  });
});
