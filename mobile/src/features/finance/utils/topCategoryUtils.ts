import type { Category, Transaction } from '@/features/finance/types';

export interface CategorySpend {
  categoryId: string | null;
  name: string;
  color: string | null;
  total: number;
  pct: number;
  barPct: number;
}

export interface TopCategoriesResult {
  rows: CategorySpend[];
  totalExpense: number;
}

export function buildTopCategories(
  transactions: Transaction[],
  categories: Category[],
  topN: number = 5,
): TopCategoriesResult {
  const expenses = transactions.filter((t) => t.amount < 0);

  if (expenses.length === 0) return { rows: [], totalExpense: 0 };

  const totals = new Map<string | null, number>();
  for (const tx of expenses) {
    const key = tx.category_id ?? null;
    totals.set(key, (totals.get(key) ?? 0) + Math.abs(tx.amount));
  }

  const totalExpense = Array.from(totals.values()).reduce((s, v) => s + v, 0);

  const sorted = Array.from(totals.entries()).sort((a, b) => b[1] - a[1]);
  const sliced = sorted.slice(0, topN);

  const maxTotal = sliced[0]?.[1] ?? 1;

  const catMap = new Map(categories.map((c) => [c.id, c]));

  const rows: CategorySpend[] = sliced.map(([categoryId, total]) => {
    const cat = categoryId != null ? catMap.get(categoryId) : undefined;
    return {
      categoryId,
      name: cat?.name ?? 'Other',
      color: cat?.color ?? null,
      total,
      pct: totalExpense > 0 ? total / totalExpense : 0,
      barPct: total / maxTotal,
    };
  });

  return { rows, totalExpense };
}
