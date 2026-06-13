import { computeBucketStatus, computeUnallocated, getBucketBarWidth } from '../budgetBucketUtils';

describe('computeBucketStatus', () => {
  it('returns no-limit when limit is null', () => {
    expect(computeBucketStatus(500_000, null)).toBe('no-limit');
    expect(computeBucketStatus(0, null)).toBe('no-limit');
  });

  it('returns on-track when nothing spent', () => {
    expect(computeBucketStatus(0, 3_000_000)).toBe('on-track');
  });

  it('returns on-track when spend is under 80% of limit', () => {
    expect(computeBucketStatus(2_000_000, 3_000_000)).toBe('on-track'); // 66%
  });

  it('returns warning when spend is 80–99% of limit', () => {
    expect(computeBucketStatus(2_400_000, 3_000_000)).toBe('warning'); // 80%
    expect(computeBucketStatus(2_900_000, 3_000_000)).toBe('warning'); // 96%
  });

  it('returns over when spend meets or exceeds limit', () => {
    expect(computeBucketStatus(3_000_000, 3_000_000)).toBe('over'); // 100%
    expect(computeBucketStatus(4_000_000, 3_000_000)).toBe('over'); // 133%
  });
});

describe('computeUnallocated', () => {
  it('returns total budget when no categories have limits', () => {
    const cats = [
      { budget_limit: null },
      { budget_limit: null },
    ];
    expect(computeUnallocated(10_000_000, cats as any)).toBe(10_000_000);
  });

  it('subtracts sum of non-null limits from total', () => {
    const cats = [
      { budget_limit: 3_000_000 },
      { budget_limit: 2_000_000 },
      { budget_limit: null },
    ];
    expect(computeUnallocated(10_000_000, cats as any)).toBe(5_000_000);
  });

  it('returns negative when limits exceed total (over-allocated)', () => {
    const cats = [{ budget_limit: 8_000_000 }, { budget_limit: 5_000_000 }];
    expect(computeUnallocated(10_000_000, cats as any)).toBe(-3_000_000);
  });

  it('includes fixed expense budget_limit in unallocated calculation', () => {
    const cats = [
      { budget_limit: 3_000_000 }, // fixed (rent)
      { budget_limit: 500_000 },   // variable (food)
      { budget_limit: null },       // variable (no limit)
    ];
    expect(computeUnallocated(5_000_000, cats as any)).toBe(1_500_000);
  });
});

describe('getBucketBarWidth', () => {
  it('returns 0 when nothing spent', () => {
    expect(getBucketBarWidth(0, 3_000_000)).toBe(0);
    expect(getBucketBarWidth(0, null)).toBe(0);
  });

  it('returns ratio of spent/limit when limit is set, capped at 1', () => {
    expect(getBucketBarWidth(1_500_000, 3_000_000)).toBe(0.5);
    expect(getBucketBarWidth(4_000_000, 3_000_000)).toBe(1); // capped
  });

  it('returns 0 when no limit set (informational only)', () => {
    expect(getBucketBarWidth(1_000_000, null)).toBe(0);
  });
});
