let mockInitialized = true;
let mockIsGuest = false;
let mockDismissedFirstRun = false;

let mockAccountsData: { id: string; is_archived: boolean; balance: number }[] = [];
let mockAccountsLoading = false;
let mockTxData: { items: { id: string }[] } | undefined = { items: [] };
let mockTxLoading = false;
let mockBudget: { id: string } | null = null;
let mockBudgetLoading = false;

jest.mock("@/stores/auth", () => ({
  useAuthStore: (selector: (s: { initialized: boolean; isGuest: boolean }) => unknown) =>
    selector({ initialized: mockInitialized, isGuest: mockIsGuest }),
}));

jest.mock("@/stores/onboarding", () => ({
  useOnboardingStore: (selector: (s: { dismissedFirstRun: boolean }) => unknown) =>
    selector({ dismissedFirstRun: mockDismissedFirstRun }),
}));

jest.mock("@/features/finance/hooks/useAccounts", () => ({
  useAccounts: () => ({ data: mockAccountsData, isLoading: mockAccountsLoading }),
}));

jest.mock("@/features/finance/hooks/useTransactions", () => ({
  useTransactions: () => ({ data: mockTxData, isLoading: mockTxLoading }),
}));

jest.mock("@/features/finance/hooks/useBudget", () => ({
  useBudget: () => ({ data: mockBudget, isLoading: mockBudgetLoading }),
}));

import { renderHook } from "@testing-library/react-native";
import { useFirstRun } from "@/features/finance/hooks/useFirstRun";

describe("useFirstRun", () => {
  beforeEach(() => {
    mockInitialized = true;
    mockIsGuest = false;
    mockDismissedFirstRun = false;
    mockAccountsData = [];
    mockAccountsLoading = false;
    mockTxData = { items: [] };
    mockTxLoading = false;
    mockBudget = null;
    mockBudgetLoading = false;
  });

  it("isFirstRun=true when no accounts, no transactions, not dismissed, authenticated", async () => {
    const { result } = await renderHook(() => useFirstRun());

    expect(result.current.isFirstRun).toBe(true);
    expect(result.current.hasAccount).toBe(false);
    expect(result.current.hasFirstTransaction).toBe(false);
    expect(result.current.setupStep).toBe(1);
  });

  it("isFirstRun=false when account exists; setupStep=2", async () => {
    mockAccountsData = [{ id: "a1", is_archived: false, balance: 0 }];

    const { result } = await renderHook(() => useFirstRun());

    expect(result.current.isFirstRun).toBe(false);
    expect(result.current.hasAccount).toBe(true);
    expect(result.current.setupStep).toBe(2);
  });

  it("isFirstRun=false when transaction exists; setupStep=3", async () => {
    mockAccountsData = [{ id: "a1", is_archived: false, balance: 0 }];
    mockTxData = { items: [{ id: "t1" }] };

    const { result } = await renderHook(() => useFirstRun());

    expect(result.current.isFirstRun).toBe(false);
    expect(result.current.hasFirstTransaction).toBe(true);
    expect(result.current.setupStep).toBe(3);
  });

  it("archived accounts do not count toward hasAccount", async () => {
    mockAccountsData = [{ id: "a1", is_archived: true, balance: 0 }];

    const { result } = await renderHook(() => useFirstRun());

    expect(result.current.hasAccount).toBe(false);
    expect(result.current.isFirstRun).toBe(true);
  });

  it("guest user is never in first-run state", async () => {
    mockIsGuest = true;

    const { result } = await renderHook(() => useFirstRun());

    expect(result.current.isFirstRun).toBe(false);
  });

  it("dismissed user is never in first-run state", async () => {
    mockDismissedFirstRun = true;

    const { result } = await renderHook(() => useFirstRun());

    expect(result.current.isFirstRun).toBe(false);
  });

  it("hasBudget=true when budget returned", async () => {
    mockAccountsData = [{ id: "a1", is_archived: false, balance: 0 }];
    mockTxData = { items: [{ id: "t1" }] };
    mockBudget = { id: "b1" };

    const { result } = await renderHook(() => useFirstRun());

    expect(result.current.hasBudget).toBe(true);
  });

  it("isLoading=true when any sub-query is loading", async () => {
    mockAccountsLoading = true;

    const { result } = await renderHook(() => useFirstRun());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.isFirstRun).toBe(false);
  });
});
