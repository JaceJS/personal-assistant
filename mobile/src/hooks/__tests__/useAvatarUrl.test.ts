let mockUser: { user_metadata?: { avatar_url?: string } } | null = null;
let mockIsGuest = false;

jest.mock("@/stores/auth", () => ({
  useAuthStore: (selector: (s: { user: typeof mockUser; isGuest: boolean }) => unknown) =>
    selector({ user: mockUser, isGuest: mockIsGuest }),
}));

import { renderHook } from "@testing-library/react-native";
import { useAvatarUrl } from "@/hooks/useAvatarUrl";

describe("useAvatarUrl", () => {
  beforeEach(() => {
    mockUser = null;
    mockIsGuest = false;
  });

  it("returns null for guest users", async () => {
    mockIsGuest = true;
    mockUser = { user_metadata: { avatar_url: "https://cdn.example.com/a.jpg" } };

    const { result } = await renderHook(() => useAvatarUrl());

    expect(result.current).toBeNull();
  });

  it("returns the user's avatar_url when authenticated", async () => {
    mockIsGuest = false;
    mockUser = { user_metadata: { avatar_url: "https://cdn.example.com/a.jpg" } };

    const { result } = await renderHook(() => useAvatarUrl());

    expect(result.current).toBe("https://cdn.example.com/a.jpg");
  });

  it("returns null when authenticated user has no avatar_url", async () => {
    mockIsGuest = false;
    mockUser = { user_metadata: {} };

    const { result } = await renderHook(() => useAvatarUrl());

    expect(result.current).toBeNull();
  });
});
