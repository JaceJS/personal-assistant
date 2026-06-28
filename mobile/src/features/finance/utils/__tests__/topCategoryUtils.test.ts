import { buildTopCategories } from '../topCategoryUtils';
import type { Category, Transaction } from '../../types';

function makeTx(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: 'tx-1',
    user_id: 'u1',
    account_id: 'acc-1',
    category_id: null,
    amount: -10_000,
    currency: 'IDR',
    merchant: null,
    note: null,
    occurred_at: '2026-06-01T10:00:00Z',
    source: 'manual',
    status: 'confirmed',
    voice_log_id: null,
    created_at: '2026-06-01T10:00:00Z',
    updated_at: '2026-06-01T10:00:00Z',
    ...overrides,
  };
}

function makeCat(overrides: Partial<Category> = {}): Category {
  return {
    id: 'cat-1',
    user_id: 'u1',
    name: 'Makan',
    type: 'expense',
    icon: null,
    color: '#E87B6F',
    budget_limit: null,
    is_fixed: false,
    is_archived: false,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('buildTopCategories', () => {
  it('returns empty when no transactions', () => {
    const result = buildTopCategories([], [], 5);
    expect(result.rows).toHaveLength(0);
    expect(result.totalExpense).toBe(0);
  });

  it('ignores income transactions (amount > 0)', () => {
    const txs = [
      makeTx({ id: 'tx-1', amount: 5_000_000, category_id: 'cat-1' }),
      makeTx({ id: 'tx-2', amount: -200_000, category_id: 'cat-1' }),
    ];
    const cats = [makeCat()];
    const result = buildTopCategories(txs, cats, 5);
    expect(result.totalExpense).toBe(200_000);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].total).toBe(200_000);
  });

  it('groups transactions by category_id and sums absolute amounts', () => {
    const txs = [
      makeTx({ id: 'tx-1', amount: -100_000, category_id: 'cat-1' }),
      makeTx({ id: 'tx-2', amount: -50_000, category_id: 'cat-1' }),
      makeTx({ id: 'tx-3', amount: -200_000, category_id: 'cat-2' }),
    ];
    const cats = [
      makeCat({ id: 'cat-1', name: 'Makan' }),
      makeCat({ id: 'cat-2', name: 'Transport', color: '#6F9FE8' }),
    ];
    const result = buildTopCategories(txs, cats, 5);
    expect(result.totalExpense).toBe(350_000);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0].categoryId).toBe('cat-2');
    expect(result.rows[0].total).toBe(200_000);
    expect(result.rows[1].categoryId).toBe('cat-1');
    expect(result.rows[1].total).toBe(150_000);
  });

  it('buckets null category_id as "Tanpa Kategori"', () => {
    const txs = [
      makeTx({ id: 'tx-1', amount: -80_000, category_id: null }),
      makeTx({ id: 'tx-2', amount: -20_000, category_id: null }),
    ];
    const result = buildTopCategories(txs, [], 5);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].categoryId).toBeNull();
    expect(result.rows[0].name).toBe('Other');
    expect(result.rows[0].total).toBe(100_000);
  });

  it('sorts descending by total', () => {
    const txs = [
      makeTx({ id: 'tx-1', amount: -10_000, category_id: 'cat-a' }),
      makeTx({ id: 'tx-2', amount: -500_000, category_id: 'cat-b' }),
      makeTx({ id: 'tx-3', amount: -250_000, category_id: 'cat-c' }),
    ];
    const cats = [
      makeCat({ id: 'cat-a', name: 'A' }),
      makeCat({ id: 'cat-b', name: 'B' }),
      makeCat({ id: 'cat-c', name: 'C' }),
    ];
    const result = buildTopCategories(txs, cats, 5);
    expect(result.rows.map((r) => r.categoryId)).toEqual(['cat-b', 'cat-c', 'cat-a']);
  });

  it('slices to topN', () => {
    const txs = Array.from({ length: 8 }, (_, i) =>
      makeTx({ id: `tx-${i}`, amount: -(i + 1) * 10_000, category_id: `cat-${i}` }),
    );
    const cats = Array.from({ length: 8 }, (_, i) =>
      makeCat({ id: `cat-${i}`, name: `Cat${i}` }),
    );
    const result = buildTopCategories(txs, cats, 5);
    expect(result.rows).toHaveLength(5);
  });

  it('computes pct as fraction of totalExpense', () => {
    const txs = [
      makeTx({ id: 'tx-1', amount: -300_000, category_id: 'cat-1' }),
      makeTx({ id: 'tx-2', amount: -100_000, category_id: 'cat-2' }),
      makeTx({ id: 'tx-3', amount: -100_000, category_id: 'cat-3' }),
    ];
    const cats = [
      makeCat({ id: 'cat-1', name: 'A' }),
      makeCat({ id: 'cat-2', name: 'B' }),
      makeCat({ id: 'cat-3', name: 'C' }),
    ];
    const result = buildTopCategories(txs, cats, 5);
    expect(result.rows[0].pct).toBeCloseTo(0.6);
    expect(result.rows[1].pct).toBeCloseTo(0.2);
    expect(result.rows[2].pct).toBeCloseTo(0.2);
  });

  it('computes barPct as fraction of largest category total', () => {
    const txs = [
      makeTx({ id: 'tx-1', amount: -400_000, category_id: 'cat-1' }),
      makeTx({ id: 'tx-2', amount: -200_000, category_id: 'cat-2' }),
    ];
    const cats = [
      makeCat({ id: 'cat-1', name: 'A' }),
      makeCat({ id: 'cat-2', name: 'B' }),
    ];
    const result = buildTopCategories(txs, cats, 5);
    expect(result.rows[0].barPct).toBe(1);
    expect(result.rows[1].barPct).toBe(0.5);
  });

  it('resolves name and color from Category list', () => {
    const txs = [makeTx({ id: 'tx-1', amount: -100_000, category_id: 'cat-xyz' })];
    const cats = [makeCat({ id: 'cat-xyz', name: 'Hiburan', color: '#AABBCC' })];
    const result = buildTopCategories(txs, cats, 5);
    expect(result.rows[0].name).toBe('Hiburan');
    expect(result.rows[0].color).toBe('#AABBCC');
  });

  it('uses null color when category not found (unknown id)', () => {
    const txs = [makeTx({ id: 'tx-1', amount: -100_000, category_id: 'unknown-id' })];
    const result = buildTopCategories(txs, [], 5);
    expect(result.rows[0].color).toBeNull();
    expect(result.rows[0].name).toBe('Other');
  });

  it('handles zero total (division guard)', () => {
    const result = buildTopCategories([], [], 5);
    expect(result.rows).toHaveLength(0);
    expect(result.totalExpense).toBe(0);
  });
});
