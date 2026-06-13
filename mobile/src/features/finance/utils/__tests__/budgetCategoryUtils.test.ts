import { splitBudgetCategories } from '../budgetCategoryUtils';
import type { Category } from '@/features/finance/types';

const base: Omit<Category, 'id' | 'name' | 'type' | 'user_id' | 'is_fixed' | 'is_archived'> = {
  icon: null,
  color: null,
  budget_limit: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

function cat(overrides: Partial<Category> & Pick<Category, 'id' | 'name' | 'type' | 'user_id' | 'is_fixed' | 'is_archived'>): Category {
  return { ...base, ...overrides };
}

const USER_ID = 'user-1';

describe('splitBudgetCategories', () => {
  it('excludes system categories (user_id=null) from both sections', () => {
    const categories = [
      cat({ id: '1', name: 'Food', type: 'expense', user_id: null, is_fixed: false, is_archived: false }),
      cat({ id: '2', name: 'Rent', type: 'expense', user_id: null, is_fixed: true, is_archived: false }),
    ];
    const { bills, spending } = splitBudgetCategories(categories);
    expect(bills).toHaveLength(0);
    expect(spending).toHaveLength(0);
  });

  it('excludes income categories', () => {
    const categories = [
      cat({ id: '1', name: 'Salary', type: 'income', user_id: USER_ID, is_fixed: false, is_archived: false }),
    ];
    const { bills, spending } = splitBudgetCategories(categories);
    expect(bills).toHaveLength(0);
    expect(spending).toHaveLength(0);
  });

  it('excludes archived categories', () => {
    const categories = [
      cat({ id: '1', name: 'Old Food', type: 'expense', user_id: USER_ID, is_fixed: false, is_archived: true }),
      cat({ id: '2', name: 'Old Rent', type: 'expense', user_id: USER_ID, is_fixed: true, is_archived: true }),
    ];
    const { bills, spending } = splitBudgetCategories(categories);
    expect(bills).toHaveLength(0);
    expect(spending).toHaveLength(0);
  });

  it('routes is_fixed=true to bills', () => {
    const categories = [
      cat({ id: '1', name: 'Rent', type: 'expense', user_id: USER_ID, is_fixed: true, is_archived: false }),
      cat({ id: '2', name: 'Netflix', type: 'expense', user_id: USER_ID, is_fixed: true, is_archived: false }),
    ];
    const { bills, spending } = splitBudgetCategories(categories);
    expect(bills).toHaveLength(2);
    expect(spending).toHaveLength(0);
  });

  it('routes is_fixed=false to spending', () => {
    const categories = [
      cat({ id: '1', name: 'Food', type: 'expense', user_id: USER_ID, is_fixed: false, is_archived: false }),
      cat({ id: '2', name: 'Entertainment', type: 'expense', user_id: USER_ID, is_fixed: false, is_archived: false }),
    ];
    const { bills, spending } = splitBudgetCategories(categories);
    expect(bills).toHaveLength(0);
    expect(spending).toHaveLength(2);
  });

  it('splits mixed list correctly', () => {
    const categories = [
      cat({ id: '1', name: 'Rent', type: 'expense', user_id: USER_ID, is_fixed: true, is_archived: false }),
      cat({ id: '2', name: 'Food', type: 'expense', user_id: USER_ID, is_fixed: false, is_archived: false }),
      cat({ id: '3', name: 'System Food', type: 'expense', user_id: null, is_fixed: false, is_archived: false }),
      cat({ id: '4', name: 'Salary', type: 'income', user_id: USER_ID, is_fixed: false, is_archived: false }),
      cat({ id: '5', name: 'Old Cat', type: 'expense', user_id: USER_ID, is_fixed: false, is_archived: true }),
      cat({ id: '6', name: 'Netflix', type: 'expense', user_id: USER_ID, is_fixed: true, is_archived: false }),
    ];
    const { bills, spending } = splitBudgetCategories(categories);
    expect(bills.map(c => c.id)).toEqual(['1', '6']);
    expect(spending.map(c => c.id)).toEqual(['2']);
  });
});
