jest.mock("@/lib/supabase", () => ({
  supabase: { auth: { getSession: jest.fn().mockResolvedValue({ data: { session: null } }) } },
}));

import { toGuestAccountSnapshots } from "../guestChat";
import type { Account } from "@/features/finance/types";

const makeAccount = (overrides: Partial<Account> = {}): Account => ({
  id: "acc-1",
  user_id: "",
  name: "Dompet",
  type: "cash",
  currency: "IDR",
  initial_balance: 0,
  balance: 100_000,
  is_archived: false,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
  ...overrides,
});

describe("toGuestAccountSnapshots", () => {
  it("maps id, name, balance, and currency", () => {
    const result = toGuestAccountSnapshots([makeAccount({ id: "acc-1", name: "Dompet", balance: 500_000 })]);

    expect(result).toEqual([{ id: "acc-1", name: "Dompet", balance: 500_000, currency: "IDR" }]);
  });

  it("excludes archived accounts", () => {
    const result = toGuestAccountSnapshots([
      makeAccount({ id: "acc-1", is_archived: true }),
      makeAccount({ id: "acc-2", is_archived: false }),
    ]);

    expect(result.map((a) => a.id)).toEqual(["acc-2"]);
  });

  it("returns an empty array for no accounts", () => {
    expect(toGuestAccountSnapshots([])).toEqual([]);
  });
});
