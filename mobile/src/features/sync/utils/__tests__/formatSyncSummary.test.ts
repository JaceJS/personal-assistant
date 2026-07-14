import i18n from "@/i18n";
import { formatSyncSummary } from "../formatSyncSummary";

describe("formatSyncSummary", () => {
  it("joins every non-zero item with a comma", () => {
    const text = formatSyncSummary(i18n.t, {
      accounts: 2,
      transactions: 10,
      hasBudget: true,
      savingsGoals: 1,
    });

    expect(text).toBe("2 akun, 10 transaksi, 1 budget, 1 tujuan tabungan");
  });

  it("omits accounts when there are none", () => {
    const text = formatSyncSummary(i18n.t, {
      accounts: 0,
      transactions: 3,
      hasBudget: false,
      savingsGoals: 0,
    });

    expect(text).toBe("3 transaksi");
  });

  it("omits budget when not set", () => {
    const text = formatSyncSummary(i18n.t, {
      accounts: 1,
      transactions: 0,
      hasBudget: false,
      savingsGoals: 0,
    });

    expect(text).toBe("1 akun");
  });

  it("omits savings goals when there are none", () => {
    const text = formatSyncSummary(i18n.t, {
      accounts: 1,
      transactions: 0,
      hasBudget: true,
      savingsGoals: 0,
    });

    expect(text).toBe("1 akun, 1 budget");
  });
});
