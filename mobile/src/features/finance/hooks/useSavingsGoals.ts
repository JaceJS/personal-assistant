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
import type { SavingsGoalContribute, SavingsGoalCreate, SavingsGoalUpdate } from "@/features/finance/types";

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
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: SavingsGoalCreate) => createSavingsGoal(data),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: [QUERY_KEY] }),
  });
}

export function useUpdateSavingsGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: SavingsGoalUpdate }) =>
      updateSavingsGoal(id, data),
    onSuccess: (_, { id }) => {
      void queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      void queryClient.invalidateQueries({ queryKey: [QUERY_KEY, id] });
    },
  });
}

export function useContributeSavingsGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: SavingsGoalContribute }) =>
      contributeToSavingsGoal(id, data),
    onSuccess: (_, { id }) => {
      void queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      void queryClient.invalidateQueries({ queryKey: [QUERY_KEY, id] });
    },
  });
}

export function useDeleteSavingsGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteSavingsGoal(id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: [QUERY_KEY] }),
  });
}
