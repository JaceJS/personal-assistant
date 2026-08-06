const mockOnAuthStateChange = jest.fn();
const mockUnsubscribe = jest.fn();

jest.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
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

type AuthChangeCallback = (event: string, session: unknown) => void;

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

function getMockQueryClient() {
  return (jest.requireMock("@/lib/queryClient") as { queryClient: { clear: jest.Mock } }).queryClient;
}

// Supabase fires onAuthStateChange once on subscribe with whatever session
// it already has — this simulates that first (cold-start) call.
async function mountAndFireColdStart(session: unknown = null): Promise<AuthChangeCallback> {
  renderHook(() => useAuth());
  await waitFor(() => expect(mockOnAuthStateChange).toHaveBeenCalled());
  const onChangeCallback = mockOnAuthStateChange.mock.calls[0][0] as AuthChangeCallback;
  onChangeCallback("INITIAL_SESSION", session);
  return onChangeCallback;
}

describe("useAuth: guest-data merge prompt", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetStores();
    mockOnAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: mockUnsubscribe } } });
  });

  it("shows the merge prompt on cold start when a session exists and local guest data is present", async () => {
    mockGetLocalDataSummary.mockResolvedValue(SUMMARY);

    await mountAndFireColdStart(SESSION);

    await waitFor(() => expect(useSyncPromptStore.getState().phase).toBe("pending"));
    expect(useSyncPromptStore.getState().summary).toEqual(SUMMARY);
  });

  it("does not show the prompt on cold start when there is no local guest data", async () => {
    mockGetLocalDataSummary.mockResolvedValue(null);

    await mountAndFireColdStart(SESSION);

    await waitFor(() => expect(useAuthStore.getState().initialized).toBe(true));
    expect(useSyncPromptStore.getState().phase).toBe("idle");
  });

  it("does not check for local data when there is no session (guest mode)", async () => {
    await mountAndFireColdStart(null);

    await waitFor(() => expect(useAuthStore.getState().mode).toBe("guest"));
    expect(mockGetLocalDataSummary).not.toHaveBeenCalled();
  });

  it("shows the prompt when a guest signs in and has local data (SIGNED_IN transition)", async () => {
    mockGetLocalDataSummary.mockResolvedValue(SUMMARY);
    const onChangeCallback = await mountAndFireColdStart(null);
    await waitFor(() => expect(useAuthStore.getState().mode).toBe("guest"));

    onChangeCallback("SIGNED_IN", SESSION);

    await waitFor(() => expect(useSyncPromptStore.getState().phase).toBe("pending"));
  });
});

describe("useAuth: cold start never wipes cache or chat session", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetStores();
    mockOnAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: mockUnsubscribe } } });
    mockGetLocalDataSummary.mockResolvedValue(null);
  });

  it("does not clear the query cache or chat session on cold start with an existing session", async () => {
    await mountAndFireColdStart(SESSION);

    await waitFor(() => expect(useAuthStore.getState().initialized).toBe(true));
    expect(getMockQueryClient().clear).not.toHaveBeenCalled();
    expect(mockAsyncStorageRemoveItem).not.toHaveBeenCalled();
  });

  it("does not clear anything when a second INITIAL_SESSION-like event repeats the same user", async () => {
    const onChangeCallback = await mountAndFireColdStart(SESSION);
    await waitFor(() => expect(useAuthStore.getState().initialized).toBe(true));

    onChangeCallback("TOKEN_REFRESHED", SESSION);

    expect(getMockQueryClient().clear).not.toHaveBeenCalled();
    expect(mockAsyncStorageRemoveItem).not.toHaveBeenCalled();
  });
});

describe("useAuth: query cache on real identity change", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetStores();
    mockOnAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: mockUnsubscribe } } });
    mockGetLocalDataSummary.mockResolvedValue(null);
  });

  async function coldStartThenFire(
    coldStartSession: unknown,
    event: string,
    session: unknown
  ) {
    const onChangeCallback = await mountAndFireColdStart(coldStartSession);
    await waitFor(() => expect(useAuthStore.getState().initialized).toBe(true));
    onChangeCallback(event, session);
  }

  it("clears the query cache when a guest signs in", async () => {
    await coldStartThenFire(null, "SIGNED_IN", SESSION);

    expect(getMockQueryClient().clear).toHaveBeenCalled();
  });

  it("clears the query cache when switching to a different authenticated user", async () => {
    await coldStartThenFire(SESSION, "SIGNED_IN", { user: { id: "user-2" } });

    expect(getMockQueryClient().clear).toHaveBeenCalled();
  });

  it("does not clear the query cache on a token refresh for the same user, and never touches the chat session key", async () => {
    await coldStartThenFire(SESSION, "TOKEN_REFRESHED", SESSION);

    expect(getMockQueryClient().clear).not.toHaveBeenCalled();
    expect(mockAsyncStorageRemoveItem).not.toHaveBeenCalled();
  });

  it("never clears the chat session key on sign-in, even for a different user", async () => {
    await coldStartThenFire(SESSION, "SIGNED_IN", { user: { id: "user-2" } });

    expect(mockAsyncStorageRemoveItem).not.toHaveBeenCalled();
  });

  it("clears the query cache when a previously authenticated session is lost", async () => {
    await coldStartThenFire(SESSION, "SIGNED_OUT", null);

    expect(getMockQueryClient().clear).toHaveBeenCalled();
  });

  it("does not clear the query cache when already guest and staying guest", async () => {
    await coldStartThenFire(null, "SIGNED_OUT", null);

    expect(getMockQueryClient().clear).not.toHaveBeenCalled();
  });
});
