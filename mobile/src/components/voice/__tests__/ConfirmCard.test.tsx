import React from "react";
import { fireEvent, render } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

// A fixed reference: the real hook (TanStack Query) returns a stable array
// across re-renders, but `() => ({ data: [] })` would hand back a NEW array
// every call, making the effect's [data, categories, defaultAccountId] deps
// "change" every render and loop forever (this genuinely OOM'd node once).
const mockStableEmptyCategories: never[] = [];
jest.mock("@/features/finance/hooks/useCategories", () => ({
  useCategories: () => ({ data: mockStableEmptyCategories }),
}));

import { ConfirmCard } from "../ConfirmCard";
import type { ConfirmPayload } from "../ConfirmCard";

const account = { id: "acc-1", name: "Dompet", balance: 100000, currency: "IDR" } as never;

const TEST_SAFE_AREA_METRICS = {
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
  frame: { x: 0, y: 0, width: 400, height: 800 },
};

function renderWithSafeArea(ui: React.ReactElement) {
  return render(
    <SafeAreaProvider initialMetrics={TEST_SAFE_AREA_METRICS}>{ui}</SafeAreaProvider>
  );
}

describe("ConfirmCard", () => {
  it("defaults occurredAt to now when the data has no date of its own (voice/receipt extraction)", async () => {
    const onSave = jest.fn();
    const before = new Date();
    const { getByText } = await renderWithSafeArea(
      <ConfirmCard
        data={{ amount: -20000, currency: "IDR", merchant: "Sate", category_name: null, note: null, confidence: 0.9 }}
        accounts={[account]}
        defaultAccountId="acc-1"
        isVisible
        isSaving={false}
        onSave={onSave}
        onDismiss={jest.fn()}
      />
    );
    const after = new Date();

    fireEvent.press(getByText("Terapkan Perubahan"));

    const payload = onSave.mock.calls[0][0] as ConfirmPayload;
    expect(payload.occurredAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(payload.occurredAt.getTime()).toBeLessThanOrEqual(after.getTime());
  });

  it("initializes occurredAt from an AI draft's occurred_at, and saves it back unchanged", async () => {
    const onSave = jest.fn();
    const { getByText } = await renderWithSafeArea(
      <ConfirmCard
        data={{
          amount: -20000,
          currency: "IDR",
          merchant: "Sate",
          category_name: null,
          note: null,
          confidence: 1.0,
          occurred_at: "2026-02-01T03:00:00.000Z",
        }}
        accounts={[account]}
        defaultAccountId="acc-1"
        isVisible
        isSaving={false}
        onSave={onSave}
        onDismiss={jest.fn()}
      />
    );

    fireEvent.press(getByText("Terapkan Perubahan"));

    const payload = onSave.mock.calls[0][0] as ConfirmPayload;
    expect(payload.occurredAt.toISOString()).toBe("2026-02-01T03:00:00.000Z");
  });
});
