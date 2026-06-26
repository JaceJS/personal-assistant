import {
  computeProgressPct,
  daysRemaining,
  requiredMonthlyContribution,
  isCompleted,
} from '../savingsGoalUtils';

describe('computeProgressPct', () => {
  it('returns 0 when nothing saved', () => {
    expect(computeProgressPct(0, 5_000_000)).toBe(0);
  });

  it('returns 50 when half saved', () => {
    expect(computeProgressPct(2_500_000, 5_000_000)).toBe(50);
  });

  it('returns 100 when goal met', () => {
    expect(computeProgressPct(5_000_000, 5_000_000)).toBe(100);
  });

  it('caps at 100 when over target', () => {
    expect(computeProgressPct(6_000_000, 5_000_000)).toBe(100);
  });

  it('returns 0 when target is 0 (guard)', () => {
    expect(computeProgressPct(0, 0)).toBe(0);
  });
});

describe('isCompleted', () => {
  it('returns false when under target', () => {
    expect(isCompleted(4_999_999, 5_000_000)).toBe(false);
  });

  it('returns true when at target', () => {
    expect(isCompleted(5_000_000, 5_000_000)).toBe(true);
  });

  it('returns true when over target', () => {
    expect(isCompleted(6_000_000, 5_000_000)).toBe(true);
  });
});

describe('daysRemaining', () => {
  it('returns null when no target date', () => {
    expect(daysRemaining(null)).toBeNull();
  });

  it('returns positive days for future date', () => {
    const future = new Date();
    future.setDate(future.getDate() + 30);
    const result = daysRemaining(future.toISOString().slice(0, 10));
    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThanOrEqual(30);
  });

  it('returns 0 for today', () => {
    const today = new Date().toISOString().slice(0, 10);
    expect(daysRemaining(today)).toBe(0);
  });

  it('returns negative for past date', () => {
    const past = new Date();
    past.setDate(past.getDate() - 10);
    const result = daysRemaining(past.toISOString().slice(0, 10));
    expect(result).toBeLessThan(0);
  });
});

describe('requiredMonthlyContribution', () => {
  it('returns null when no target date', () => {
    expect(requiredMonthlyContribution(1_000_000, 5_000_000, null)).toBeNull();
  });

  it('returns null when already completed', () => {
    const future = new Date();
    future.setDate(future.getDate() + 30);
    expect(
      requiredMonthlyContribution(5_000_000, 5_000_000, future.toISOString().slice(0, 10))
    ).toBeNull();
  });

  it('returns null when deadline passed', () => {
    const past = new Date();
    past.setDate(past.getDate() - 1);
    expect(
      requiredMonthlyContribution(0, 5_000_000, past.toISOString().slice(0, 10))
    ).toBeNull();
  });

  it('calculates correct monthly amount for 5M goal in 5 months', () => {
    const future = new Date();
    future.setMonth(future.getMonth() + 5);
    const result = requiredMonthlyContribution(0, 5_000_000, future.toISOString().slice(0, 10));
    expect(result).not.toBeNull();
    expect(result!).toBeGreaterThan(900_000);
    expect(result!).toBeLessThan(1_100_000);
  });
});
