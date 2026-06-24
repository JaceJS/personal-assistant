import type { Category } from "@/features/finance/types";

export function getTransactionCategories(categories: Category[], amount: string): Category[] {
  const isIncome = Number(amount) > 0;
  const targetType = isIncome ? "income" : "expense";
  return categories.filter((c) => c.type === targetType && !c.is_archived);
}
