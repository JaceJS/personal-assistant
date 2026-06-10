import type { Category } from '@/features/finance/types';

export type BucketStatus = 'no-limit' | 'on-track' | 'warning' | 'over';

export function computeBucketStatus(spent: number, limit: number | null): BucketStatus {
  'worklet';
  if (limit === null) return 'no-limit';
  if (limit === 0) return 'on-track';
  const ratio = spent / limit;
  if (ratio >= 1) return 'over';
  if (ratio >= 0.8) return 'warning';
  return 'on-track';
}

export function computeUnallocated(totalBudget: number, categories: Pick<Category, 'budget_limit'>[]): number {
  const allocated = categories.reduce((sum, c) => sum + (c.budget_limit ?? 0), 0);
  return totalBudget - allocated;
}

export function getBucketBarWidth(spent: number, limit: number | null): number {
  'worklet';
  if (limit === null || limit === 0) return 0;
  return Math.min(spent / limit, 1);
}
