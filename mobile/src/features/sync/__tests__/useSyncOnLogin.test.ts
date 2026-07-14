import { renderHook } from "@testing-library/react-native";

const mockSyncLocalData = jest.fn();
jest.mock("../syncService", () => ({
  syncLocalData: (...args: unknown[]) => mockSyncLocalData(...args),
}));
jest.mock("../api", () => ({ importLocalData: jest.fn() }));
jest.mock("@/features/finance/repository", () => ({
  LocalRepository: jest.fn().mockImplementation(() => ({})),
}));
jest.mock("@/lib/logger", () => ({
  logger: { info: jest.fn(), error: jest.fn() },
}));

const mockInvalidateQueries = jest.fn();
jest.mock("@/lib/queryClient", () => ({
  queryClient: { invalidateQueries: (...args: unknown[]) => mockInvalidateQueries(...args) },
}));

import { useSyncOnLogin } from "../useSyncOnLogin";

describe("useSyncOnLogin", () => {
  beforeEach(() => {
    mockSyncLocalData.mockReset();
    mockInvalidateQueries.mockReset();
  });

  it("invalidates all cached finance queries after a real sync", async () => {
    mockSyncLocalData.mockResolvedValue({
      skipped: false,
      imported: { accounts: 1, categories: 1, transactions: 1, budgets: 1, savings_goals: 0 },
    });
    const { result } = await renderHook(() => useSyncOnLogin());

    await result.current();

    expect(mockInvalidateQueries).toHaveBeenCalledTimes(1);
  });

  it("invalidates cached finance queries even when sync is skipped (repo source still switched local -> remote)", async () => {
    mockSyncLocalData.mockResolvedValue({ skipped: true });
    const { result } = await renderHook(() => useSyncOnLogin());

    await result.current();

    expect(mockInvalidateQueries).toHaveBeenCalledTimes(1);
  });

  it("does not invalidate queries when sync fails (stale guest local view stays until retry)", async () => {
    mockSyncLocalData.mockRejectedValue(new Error("Network error"));
    const { result } = await renderHook(() => useSyncOnLogin());

    await result.current();

    expect(mockInvalidateQueries).not.toHaveBeenCalled();
  });
});
