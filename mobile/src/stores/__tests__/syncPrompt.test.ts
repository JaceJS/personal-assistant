import { useSyncPromptStore } from "../syncPrompt";

const SUMMARY = { accounts: 2, transactions: 10, hasBudget: true, savingsGoals: 1 };

function reset() {
  useSyncPromptStore.setState({ phase: "idle", summary: null });
}

describe("syncPrompt store", () => {
  beforeEach(reset);

  it("starts idle with no summary", () => {
    const state = useSyncPromptStore.getState();
    expect(state.phase).toBe("idle");
    expect(state.summary).toBeNull();
  });

  it("showPrompt moves to pending and stores the summary", () => {
    useSyncPromptStore.getState().showPrompt(SUMMARY);

    const state = useSyncPromptStore.getState();
    expect(state.phase).toBe("pending");
    expect(state.summary).toEqual(SUMMARY);
  });

  it("startSyncing moves to syncing without touching the summary", () => {
    useSyncPromptStore.getState().showPrompt(SUMMARY);
    useSyncPromptStore.getState().startSyncing();

    const state = useSyncPromptStore.getState();
    expect(state.phase).toBe("syncing");
    expect(state.summary).toEqual(SUMMARY);
  });

  it("syncSucceeded resets to idle and clears the summary", () => {
    useSyncPromptStore.getState().showPrompt(SUMMARY);
    useSyncPromptStore.getState().startSyncing();
    useSyncPromptStore.getState().syncSucceeded();

    const state = useSyncPromptStore.getState();
    expect(state.phase).toBe("idle");
    expect(state.summary).toBeNull();
  });

  it("syncFailed moves to error and keeps the summary for a retry", () => {
    useSyncPromptStore.getState().showPrompt(SUMMARY);
    useSyncPromptStore.getState().startSyncing();
    useSyncPromptStore.getState().syncFailed();

    const state = useSyncPromptStore.getState();
    expect(state.phase).toBe("error");
    expect(state.summary).toEqual(SUMMARY);
  });

  it("dismiss resets to idle and clears the summary (local data stays untouched, may prompt again later)", () => {
    useSyncPromptStore.getState().showPrompt(SUMMARY);
    useSyncPromptStore.getState().dismiss();

    const state = useSyncPromptStore.getState();
    expect(state.phase).toBe("idle");
    expect(state.summary).toBeNull();
  });
});
