import * as ExpoCrypto from "expo-crypto";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useFinanceRepository } from "@/features/finance/repository";
import type { Budget, BudgetUpsert } from "@/features/finance/types";

const QUERY_KEY = "budget";

export function useBudget() {
  const repo = useFinanceRepository();
  return useQuery<Budget | null>({
    queryKey: [QUERY_KEY],
    queryFn: () => repo.getBudget(),
  });
}

export function useUpsertBudget() {
  const repo = useFinanceRepository();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: BudgetUpsert) =>
      repo.upsertBudget({ ...data, id: ExpoCrypto.randomUUID() }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: [QUERY_KEY] }),
  });
}
