let mockUser: { user_metadata?: { full_name?: string }; email?: string } | null = null;
let mockIsGuest = false;
let mockGuestName = "";

jest.mock("@/stores/auth", () => ({
  useAuthStore: (selector: (s: { user: typeof mockUser; isGuest: boolean }) => unknown) =>
    selector({ user: mockUser, isGuest: mockIsGuest }),
}));

jest.mock("@/stores/onboarding", () => ({
  useOnboardingStore: (selector: (s: { guestName: string }) => unknown) =>
    selector({ guestName: mockGuestName }),
}));

import { renderHook } from "@testing-library/react-native";
import { useDisplayName } from "@/hooks/useDisplayName";

describe("useDisplayName", () => {
  beforeEach(() => {
    mockUser = null;
    mockIsGuest = false;
    mockGuestName = "";
  });

  it("returns guestName when isGuest is true", async () => {
    mockIsGuest = true;
    mockGuestName = "Jace";

    const { result } = await renderHook(() => useDisplayName());

    expect(result.current).toBe("Jace");
  });

  it("returns empty string when guest has not entered a name yet", async () => {
    mockIsGuest = true;
    mockGuestName = "";

    const { result } = await renderHook(() => useDisplayName());

    expect(result.current).toBe("");
  });

  it("returns user's display name when authenticated (ignores guestName)", async () => {
    mockIsGuest = false;
    mockGuestName = "StaleGuestName";
    mockUser = { user_metadata: { full_name: "Budi Santoso" } };

    const { result } = await renderHook(() => useDisplayName());

    expect(result.current).toBe("Budi");
  });
});
