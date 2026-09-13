jest.mock("@/lib/db/client", () => ({ db: null }));
jest.mock("@/lib/supabase", () => ({ supabase: { auth: { signOut: jest.fn() } } }));
jest.mock("@/lib/logger", () => ({
  logger: { identifyUser: jest.fn(), resetUser: jest.fn(), error: jest.fn(), info: jest.fn() },
}));
jest.mock("@/lib/queryClient", () => ({ queryClient: { clear: jest.fn() } }));

import { renderHook } from "@testing-library/react-native";
import { useAuthStore } from "@/stores/auth";
import { useFinanceRepository, LocalRepository, RemoteRepository } from "../index";
import { SyncedRepository } from "../synced-repository";

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

describe("useFinanceRepository", () => {
  it("returns LocalRepository for a guest", async () => {
    setAuth({ isGuest: true, user: null });
    const { result } = await renderHook(() => useFinanceRepository());
    expect(result.current).toBeInstanceOf(LocalRepository);
  });

  it("returns SyncedRepository for an allowlisted authenticated user", async () => {
    setAuth({ isGuest: false, user: { id: "user-1", email: ALLOWED_EMAIL } as never });
    const { result } = await renderHook(() => useFinanceRepository());
    expect(result.current).toBeInstanceOf(SyncedRepository);
  });

  it("returns RemoteRepository for an authenticated user not on the allowlist", async () => {
    setAuth({ isGuest: false, user: { id: "user-2", email: "someone-else@example.com" } as never });
    const { result } = await renderHook(() => useFinanceRepository());
    expect(result.current).toBeInstanceOf(RemoteRepository);
  });
});
