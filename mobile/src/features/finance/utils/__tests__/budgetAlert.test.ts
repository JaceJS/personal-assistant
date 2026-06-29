import { computeBudgetAlert } from "../budgetAlert";

describe("computeBudgetAlert", () => {
  it("returns null when limit is zero", () => {
    expect(computeBudgetAlert(0, 0, 50_000)).toBeNull();
  });

  it("returns null when new amount is zero", () => {
    expect(computeBudgetAlert(1_000_000, 500_000, 0)).toBeNull();
  });

  it("returns null when spend stays below 80%", () => {
    // 500k + 200k = 700k = 70% of 1M
    expect(computeBudgetAlert(1_000_000, 500_000, 200_000)).toBeNull();
  });

  it("returns warning when total crosses 80%", () => {
    // 700k + 150k = 850k = 85% of 1M
    const result = computeBudgetAlert(1_000_000, 700_000, 150_000);
    expect(result?.level).toBe("warning");
  });

  it("returns critical when total reaches 100%", () => {
    // 900k + 100k = 1M = 100%
    const result = computeBudgetAlert(1_000_000, 900_000, 100_000);
    expect(result?.level).toBe("critical");
  });

  it("returns critical when total exceeds 100%", () => {
    // 900k + 200k = 1.1M > 100%
    const result = computeBudgetAlert(1_000_000, 900_000, 200_000);
    expect(result?.level).toBe("critical");
  });

  it("returns critical (not warning) when already above 80% and crossing 100%", () => {
    // 850k + 200k = 1.05M
    const result = computeBudgetAlert(1_000_000, 850_000, 200_000);
    expect(result?.level).toBe("critical");
  });

  it("includes remaining amount in message", () => {
    // 700k + 150k = 850k, remaining = 150k
    const result = computeBudgetAlert(1_000_000, 700_000, 150_000);
    expect(result?.remaining).toBe(150_000);
  });

  it("returns zero remaining when limit exceeded", () => {
    const result = computeBudgetAlert(1_000_000, 900_000, 200_000);
    expect(result?.remaining).toBe(0);
  });
});
