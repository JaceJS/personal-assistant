import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth";
import {
  listSavingsGoals,
  getSavingsGoal,
  createSavingsGoal,
  updateSavingsGoal,
  contributeToSavingsGoal,
  deleteSavingsGoal,
} from "@/features/finance/api/savingsGoals";
import type { SavingsGoal, SavingsGoalContribute, SavingsGoalCreate, SavingsGoalUpdate } from "@/features/finance/types";

const QUERY_KEY = "savings-goals";

export function useSavingsGoals() {
  const { initialized, isGuest } = useAuthStore();
  return useQuery({
    queryKey: [QUERY_KEY],
    queryFn: listSavingsGoals,
    enabled: initialized && !isGuest,
  });
}

export function useSavingsGoal(id: string) {
  const { initialized, isGuest } = useAuthStore();
  return useQuery({
    queryKey: [QUERY_KEY, id],
    queryFn: () => getSavingsGoal(id),
    enabled: initialized && !isGuest && !!id,
  });
}

export function useCreateSavingsGoal() {
  const isGuest = useAuthStore((s) => s.isGuest);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: SavingsGoalCreate) => {
      if (isGuest) return Promise.resolve({} as SavingsGoal);
      return createSavingsGoal(data);
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: [QUERY_KEY] }),
  });
}

export function useUpdateSavingsGoal() {
  const isGuest = useAuthStore((s) => s.isGuest);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: SavingsGoalUpdate }) => {
      if (isGuest) return Promise.resolve({} as SavingsGoal);
      return updateSavingsGoal(id, data);
    },
    onSuccess: (updatedGoal, { id }) => {
      queryClient.setQueryData([QUERY_KEY, id], updatedGoal);
      void queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
}

export function useContributeSavingsGoal() {
  const isGuest = useAuthStore((s) => s.isGuest);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: SavingsGoalContribute }) => {
      if (isGuest) return Promise.resolve({} as SavingsGoal);
      return contributeToSavingsGoal(id, data);
    },
    onSuccess: (updatedGoal, { id }) => {
      queryClient.setQueryData([QUERY_KEY, id], updatedGoal);
      void queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
}

export function useDeleteSavingsGoal() {
  const isGuest = useAuthStore((s) => s.isGuest);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => {
      if (isGuest) return Promise.resolve();
      return deleteSavingsGoal(id);
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: [QUERY_KEY] }),
  });
}
