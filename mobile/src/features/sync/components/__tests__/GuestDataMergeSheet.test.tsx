import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

jest.mock("react-native-safe-area-context", () =>
  jest.requireActual("react-native-safe-area-context/jest/mock").default
);

const mockSyncOnLogin = jest.fn();
jest.mock("../../useSyncOnLogin", () => ({
  useSyncOnLogin: () => mockSyncOnLogin,
}));

import { useSyncPromptStore } from "@/stores/syncPrompt";
import { GuestDataMergeSheet } from "../GuestDataMergeSheet";

const SUMMARY = { accounts: 2, transactions: 10, hasBudget: true, savingsGoals: 0 };

function renderSheet() {
  return render(<GuestDataMergeSheet />);
}

function resetStore() {
  useSyncPromptStore.setState({ phase: "idle", summary: null });
}

describe("GuestDataMergeSheet", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetStore();
  });

  it("shows the formatted local-data summary while pending", async () => {
    useSyncPromptStore.setState({ phase: "pending", summary: SUMMARY });

    const { getByText } = await renderSheet();

    expect(getByText(/2 akun, 10 transaksi, 1 budget/)).toBeTruthy();
    expect(getByText("Gabungkan ke Akun")).toBeTruthy();
  });

  it("shows the error message and a retry label in error phase", async () => {
    useSyncPromptStore.setState({ phase: "error", summary: SUMMARY });

    const { getByText, queryByText } = await renderSheet();

    expect(getByText("Gagal menggabungkan data. Coba lagi?")).toBeTruthy();
    expect(getByText("Coba Lagi")).toBeTruthy();
    expect(queryByText("Gabungkan ke Akun")).toBeNull();
  });

  it("confirming runs the sync and moves to idle on success", async () => {
    useSyncPromptStore.setState({ phase: "pending", summary: SUMMARY });
    mockSyncOnLogin.mockResolvedValue(true);

    const { getByText } = await renderSheet();
    fireEvent.press(getByText("Gabungkan ke Akun"));

    await waitFor(() => expect(useSyncPromptStore.getState().phase).toBe("idle"));
    expect(mockSyncOnLogin).toHaveBeenCalledTimes(1);
    expect(useSyncPromptStore.getState().summary).toBeNull();
  });

  it("confirming moves to error phase (summary retained) when sync fails", async () => {
    useSyncPromptStore.setState({ phase: "pending", summary: SUMMARY });
    mockSyncOnLogin.mockResolvedValue(false);

    const { getByText } = await renderSheet();
    fireEvent.press(getByText("Gabungkan ke Akun"));

    await waitFor(() => expect(useSyncPromptStore.getState().phase).toBe("error"));
    expect(useSyncPromptStore.getState().summary).toEqual(SUMMARY);
  });

  it("tapping Nanti Dulu dismisses without running the sync", async () => {
    useSyncPromptStore.setState({ phase: "pending", summary: SUMMARY });

    const { getByText } = await renderSheet();
    fireEvent.press(getByText("Nanti Dulu"));

    expect(useSyncPromptStore.getState().phase).toBe("idle");
    expect(mockSyncOnLogin).not.toHaveBeenCalled();
  });
});
