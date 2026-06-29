import * as ExpoCrypto from "expo-crypto";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useFinanceRepository } from "@/features/finance/repository";
import { useAuthStore } from "@/stores/auth";
import type { Budget, BudgetUpsert } from "@/features/finance/types";

const QUERY_KEY = "budget";

export function useBudget() {
  const repo = useFinanceRepository();
  const initialized = useAuthStore((s) => s.initialized);
  return useQuery<Budget | null>({
    queryKey: [QUERY_KEY],
    queryFn: () => repo.getBudget(),
    enabled: initialized,
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
