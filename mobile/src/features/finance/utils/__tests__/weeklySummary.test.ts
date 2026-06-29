import { computeWeeklySummary, getWeekRange } from "../weeklySummary";
import type { Transaction } from "@/features/finance/types";

function makeTx(amount: number, occurred_at: string): Transaction {
  return {
    id: "t1",
    user_id: "u1",
    account_id: "a1",
    category_id: null,
    amount,
    currency: "IDR",
    merchant: null,
    note: null,
    occurred_at,
    source: "manual",
    status: "confirmed",
    voice_log_id: null,
    created_at: occurred_at,
    updated_at: occurred_at,
  };
}

describe("computeWeeklySummary", () => {
  it("returns zero values for empty list", () => {
    expect(computeWeeklySummary([])).toEqual({ income: 0, expense: 0, net: 0 });
  });

  it("sums income (positive amounts)", () => {
    const txs = [makeTx(100_000, "2025-01-01"), makeTx(50_000, "2025-01-02")];
    expect(computeWeeklySummary(txs).income).toBe(150_000);
  });

  it("sums expense (negative amounts as positive)", () => {
    const txs = [makeTx(-75_000, "2025-01-01"), makeTx(-25_000, "2025-01-02")];
    expect(computeWeeklySummary(txs).expense).toBe(100_000);
  });

  it("computes net as income minus expense", () => {
    const txs = [makeTx(200_000, "2025-01-01"), makeTx(-80_000, "2025-01-02")];
    const { income, expense, net } = computeWeeklySummary(txs);
    expect(income).toBe(200_000);
    expect(expense).toBe(80_000);
    expect(net).toBe(120_000);
  });

  it("handles negative net", () => {
    const txs = [makeTx(50_000, "2025-01-01"), makeTx(-200_000, "2025-01-02")];
    expect(computeWeeklySummary(txs).net).toBe(-150_000);
  });
});

describe("getWeekRange", () => {
  it("dateFrom is Monday of current week", () => {
    // Use a known Monday: 2025-01-06
    const monday = new Date("2025-01-06T12:00:00");
    const { dateFrom } = getWeekRange(monday);
    expect(dateFrom).toBe("2025-01-06");
  });

  it("dateTo is Sunday of current week", () => {
    const monday = new Date("2025-01-06T12:00:00");
    const { dateTo } = getWeekRange(monday);
    expect(dateTo).toBe("2025-01-12");
  });

  it("works when given a Wednesday", () => {
    const wednesday = new Date("2025-01-08T12:00:00");
    const { dateFrom, dateTo } = getWeekRange(wednesday);
    expect(dateFrom).toBe("2025-01-06");
    expect(dateTo).toBe("2025-01-12");
  });

  it("works when given a Sunday", () => {
    const sunday = new Date("2025-01-12T12:00:00");
    const { dateFrom, dateTo } = getWeekRange(sunday);
    expect(dateFrom).toBe("2025-01-06");
    expect(dateTo).toBe("2025-01-12");
  });
});
