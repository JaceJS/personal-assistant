import type { Category } from '@/features/finance/types';

export function splitBudgetCategories(categories: Category[]): {
  bills: Category[];
  spending: Category[];
} {
  const userExpense = categories.filter(c => c.type === 'expense' && !c.is_archived);
  return {
    bills: userExpense.filter(c => c.is_fixed),
    spending: userExpense.filter(c => !c.is_fixed),
  };
}
