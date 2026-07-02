import * as ExpoCrypto from "expo-crypto";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useFinanceRepository } from "@/features/finance/repository";
import { useAuthStore } from "@/stores/auth";
import type { Category, CategoryCreate, CategoryUpdate } from "@/features/finance/types";

const QUERY_KEY = "categories";

export function useCategories() {
  const repo = useFinanceRepository();
  const initialized = useAuthStore((s) => s.initialized);
  return useQuery<Category[]>({
    queryKey: [QUERY_KEY],
    queryFn: () => repo.listCategories(),
    staleTime: Infinity,
    enabled: initialized,
  });
}

export function useCreateCategory() {
  const repo = useFinanceRepository();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CategoryCreate) =>
      repo.createCategory({ ...data, id: ExpoCrypto.randomUUID() }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: [QUERY_KEY] }),
  });
}

export function useUpdateCategory() {
  const repo = useFinanceRepository();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: CategoryUpdate }) =>
      repo.updateCategory(id, data),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: [QUERY_KEY] }),
  });
}

export function useArchiveCategory() {
  const repo = useFinanceRepository();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => repo.archiveCategory(id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: [QUERY_KEY] }),
  });
}
