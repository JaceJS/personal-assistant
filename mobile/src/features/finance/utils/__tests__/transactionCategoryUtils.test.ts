import { getTransactionCategories } from "../transactionCategoryUtils";
import type { Category } from "@/features/finance/types";

function makeCategory(overrides: Partial<Category>): Category {
  return {
    id: "cat-1",
    user_id: "u1",
    name: "Test",
    type: "expense",
    icon: null,
    color: null,
    budget_limit: null,
    is_fixed: false,
    is_archived: false,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

const expenseA = makeCategory({ id: "e1", name: "Food", type: "expense" });
const expenseB = makeCategory({ id: "e2", name: "Transport", type: "expense" });
const incomeA = makeCategory({ id: "i1", name: "Salary", type: "income" });
const archivedExpense = makeCategory({ id: "e3", name: "Old", type: "expense", is_archived: true });

const all = [expenseA, expenseB, incomeA, archivedExpense];

describe("getTransactionCategories", () => {
  it("returns non-archived expense categories when amount is negative", () => {
    const result = getTransactionCategories(all, "-50000");
    expect(result).toEqual([expenseA, expenseB]);
  });

  it("returns non-archived income categories when amount is positive", () => {
    const result = getTransactionCategories(all, "100000");
    expect(result).toEqual([incomeA]);
  });

  it("returns expense categories when amount string is empty (default)", () => {
    const result = getTransactionCategories(all, "");
    expect(result).toEqual([expenseA, expenseB]);
  });

  it("returns expense categories when amount is zero", () => {
    const result = getTransactionCategories(all, "0");
    expect(result).toEqual([expenseA, expenseB]);
  });

  it("returns empty array when no categories match type", () => {
    const result = getTransactionCategories([incomeA], "-1000");
    expect(result).toEqual([]);
  });

  it("excludes archived categories regardless of type", () => {
    const result = getTransactionCategories([archivedExpense], "-1000");
    expect(result).toEqual([]);
  });
});
