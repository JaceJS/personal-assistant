import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as ExpoCrypto from "expo-crypto";
import { useFinanceRepository } from "@/features/finance/repository";
import type { SavingsGoal, SavingsGoalContribute, SavingsGoalCreate, SavingsGoalUpdate } from "@/features/finance/types";

const QUERY_KEY = "savings-goals";

export function useSavingsGoals() {
  const repo = useFinanceRepository();
  return useQuery({
    queryKey: [QUERY_KEY],
    queryFn: () => repo.listSavingsGoals(),
  });
}

export function useSavingsGoal(id: string) {
  const repo = useFinanceRepository();
  return useQuery({
    queryKey: [QUERY_KEY, id],
    queryFn: () => repo.getSavingsGoal(id),
    enabled: !!id,
  });
}

export function useCreateSavingsGoal() {
  const repo = useFinanceRepository();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: SavingsGoalCreate) =>
      repo.createSavingsGoal({ ...data, id: ExpoCrypto.randomUUID() }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: [QUERY_KEY] }),
  });
}

export function useUpdateSavingsGoal() {
  const repo = useFinanceRepository();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: SavingsGoalUpdate }) =>
      repo.updateSavingsGoal(id, data),
    onSuccess: (updatedGoal, { id }) => {
      queryClient.setQueryData([QUERY_KEY, id], updatedGoal);
      void queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
}

export function useContributeSavingsGoal() {
  const repo = useFinanceRepository();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: SavingsGoalContribute }) =>
      repo.contributeToSavingsGoal(id, data),
    onSuccess: (updatedGoal, { id }) => {
      queryClient.setQueryData([QUERY_KEY, id], updatedGoal);
      void queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
}

export function useDeleteSavingsGoal() {
  const repo = useFinanceRepository();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => repo.deleteSavingsGoal(id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: [QUERY_KEY] }),
  });
}
