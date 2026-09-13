jest.mock("@/lib/db/client", () => ({ db: null }));
jest.mock("../runOutbox", () => ({ runOutbox: jest.fn().mockResolvedValue(undefined) }));
jest.mock("../pullDeltas", () => ({ pullDeltas: jest.fn().mockResolvedValue(undefined) }));
jest.mock("@/lib/logger", () => ({ logger: { warn: jest.fn(), error: jest.fn() } }));
jest.mock("@/lib/supabase", () => ({ supabase: { auth: { signOut: jest.fn() } } }));
jest.mock("@/lib/queryClient", () => ({ queryClient: { clear: jest.fn() } }));

import NetInfo from "@react-native-community/netinfo";
import { renderHook, waitFor } from "@testing-library/react-native";
import { useAuthStore } from "@/stores/auth";
import { runOutbox } from "../runOutbox";
import { pullDeltas } from "../pullDeltas";
import { useSyncTriggers } from "../useSyncTriggers";

const ALLOWED_EMAIL = "jonathansalendah.work@gmail.com";

function setAuth(overrides: Partial<ReturnType<typeof useAuthStore.getState>>) {
  useAuthStore.setState({
    mode: "authenticated",
    isGuest: false,
    user: null,
    session: null,
    initialized: true,
    ...overrides,
  });
}

describe("useSyncTriggers", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("runs the outbox and a delta pull on mount for an allowlisted user", async () => {
    setAuth({ isGuest: false, user: { id: "user-1", email: ALLOWED_EMAIL } as never });

    await renderHook(() => useSyncTriggers());

    await waitFor(() => expect(runOutbox).toHaveBeenCalledTimes(1));
    expect(pullDeltas).toHaveBeenCalledWith("user-1");
  });

  it("does nothing for a guest", async () => {
    setAuth({ isGuest: true, user: null });

    await renderHook(() => useSyncTriggers());

    expect(runOutbox).not.toHaveBeenCalled();
    expect(pullDeltas).not.toHaveBeenCalled();
  });

  it("does nothing for an authenticated user not on the allowlist", async () => {
    setAuth({ isGuest: false, user: { id: "user-2", email: "someone-else@example.com" } as never });

    await renderHook(() => useSyncTriggers());

    expect(runOutbox).not.toHaveBeenCalled();
    expect(pullDeltas).not.toHaveBeenCalled();
  });

  it("re-syncs when connectivity is regained", async () => {
    setAuth({ isGuest: false, user: { id: "user-1", email: ALLOWED_EMAIL } as never });

    await renderHook(() => useSyncTriggers());
    await waitFor(() => expect(runOutbox).toHaveBeenCalledTimes(1));

    const listener = (NetInfo.addEventListener as jest.Mock).mock.calls[0][0];
    listener({ isConnected: true });

    await waitFor(() => expect(runOutbox).toHaveBeenCalledTimes(2));
  });
});
