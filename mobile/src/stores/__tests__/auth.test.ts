jest.mock("@/lib/supabase", () => ({
  supabase: { auth: { signOut: jest.fn().mockResolvedValue({ error: null }) } },
}));
jest.mock("@/lib/logger", () => ({
  logger: { identifyUser: jest.fn(), resetUser: jest.fn(), error: jest.fn() },
}));
jest.mock("@/lib/queryClient", () => ({ queryClient: { clear: jest.fn() } }));

import { useAuthStore } from "../auth";

const reset = () =>
  useAuthStore.setState({ mode: "authenticated", session: null, user: null, initialized: false });

describe("auth store — guest mode", () => {
  beforeEach(reset);

  it("defaults to authenticated mode", () => {
    expect(useAuthStore.getState().mode).toBe("authenticated");
  });

  it("enterGuestMode sets mode to guest", () => {
    useAuthStore.getState().enterGuestMode();
    expect(useAuthStore.getState().mode).toBe("guest");
  });

  it("exitGuestMode resets mode to authenticated", () => {
    useAuthStore.setState({ mode: "guest" });
    useAuthStore.getState().exitGuestMode();
    expect(useAuthStore.getState().mode).toBe("authenticated");
  });

  it("isGuest returns true only in guest mode", () => {
    expect(useAuthStore.getState().isGuest).toBe(false);
    useAuthStore.getState().enterGuestMode();
    expect(useAuthStore.getState().isGuest).toBe(true);
  });

  it("signOut resets to guest mode", async () => {
    useAuthStore.setState({ mode: "authenticated", session: {} as never, user: {} as never });
    await useAuthStore.getState().signOut();
    expect(useAuthStore.getState().mode).toBe("guest");
    expect(useAuthStore.getState().isGuest).toBe(true);
    expect(useAuthStore.getState().session).toBeNull();
    expect(useAuthStore.getState().user).toBeNull();
  });
});
