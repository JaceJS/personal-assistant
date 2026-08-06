import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react-native";

const mockUploadAvatar = jest.fn();
jest.mock("@/features/settings/api/avatar", () => ({
  uploadAvatar: (...args: unknown[]) => mockUploadAvatar(...args),
}));

const mockUpdateUser = jest.fn();
jest.mock("@/lib/supabase", () => ({
  supabase: { auth: { updateUser: (...args: unknown[]) => mockUpdateUser(...args) } },
}));

jest.mock("@/lib/logger", () => ({
  logger: { identifyUser: jest.fn(), resetUser: jest.fn(), error: jest.fn(), info: jest.fn() },
}));

import { useUpdateProfile } from "@/features/settings/hooks/useUpdateProfile";
import { useAuthStore } from "@/stores/auth";

const OLD_USER = { id: "user-1", user_metadata: { full_name: "Old Name" } } as never;
const NEW_USER = { id: "user-1", user_metadata: { full_name: "Budi Santoso" } } as never;
const SESSION = { access_token: "token-1", user: OLD_USER } as never;

function makeWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

describe("useUpdateProfile", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUpdateUser.mockResolvedValue({ data: { user: NEW_USER }, error: null });
    useAuthStore.setState({
      mode: "authenticated",
      isGuest: false,
      session: SESSION,
      user: OLD_USER,
      initialized: true,
    });
  });

  it("updates name only and skips avatar upload when no photo was picked", async () => {
    const { result } = await renderHook(() => useUpdateProfile(), { wrapper: makeWrapper() });

    result.current.mutate({ name: "Budi Santoso", avatarUri: null });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockUploadAvatar).not.toHaveBeenCalled();
    expect(mockUpdateUser).toHaveBeenCalledWith({ data: { full_name: "Budi Santoso" } });
  });

  it("applies the fresh user to the auth store on success, without waiting for an auth event", async () => {
    const { result } = await renderHook(() => useUpdateProfile(), { wrapper: makeWrapper() });

    result.current.mutate({ name: "Budi Santoso", avatarUri: null });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(useAuthStore.getState().user).toEqual(NEW_USER);
  });

  it("uploads the photo first and includes the returned url when a photo was picked", async () => {
    mockUploadAvatar.mockResolvedValueOnce({ url: "https://cdn.example.com/a.jpg?v=1" });

    const { result } = await renderHook(() => useUpdateProfile(), { wrapper: makeWrapper() });

    result.current.mutate({ name: "Budi", avatarUri: "file:///tmp/photo.jpg" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockUploadAvatar).toHaveBeenCalledWith("file:///tmp/photo.jpg");
    expect(mockUpdateUser).toHaveBeenCalledWith({
      data: { full_name: "Budi", avatar_url: "https://cdn.example.com/a.jpg?v=1" },
    });
  });

  it("fails the mutation when Supabase returns an error", async () => {
    mockUpdateUser.mockResolvedValueOnce({ data: null, error: new Error("network down") });

    const { result } = await renderHook(() => useUpdateProfile(), { wrapper: makeWrapper() });

    result.current.mutate({ name: "Budi", avatarUri: null });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(useAuthStore.getState().user).toEqual(OLD_USER);
  });

  it("fails the mutation when the avatar upload rejects", async () => {
    mockUploadAvatar.mockRejectedValueOnce(new Error("upload failed"));

    const { result } = await renderHook(() => useUpdateProfile(), { wrapper: makeWrapper() });

    result.current.mutate({ name: "Budi", avatarUri: "file:///tmp/photo.jpg" });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(mockUpdateUser).not.toHaveBeenCalled();
  });
});
