import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getBudget, upsertBudget } from "@/features/finance/api/budget";
import type { Budget, BudgetUpsert } from "@/features/finance/types";

const QUERY_KEY = "budget";

export function useBudget() {
  return useQuery<Budget | null>({
    queryKey: [QUERY_KEY],
    queryFn: getBudget,
  });
}

export function useUpsertBudget() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: BudgetUpsert) => upsertBudget(data),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: [QUERY_KEY] }),
  });
}
