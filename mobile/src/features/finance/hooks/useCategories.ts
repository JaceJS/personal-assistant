import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useFinanceRepository } from "@/features/finance/repository";
import { updateCategory, archiveCategory } from "@/features/finance/api/categories";
import type { Category, CategoryCreate, CategoryUpdate } from "@/features/finance/types";
import { useAuthStore } from "@/stores/auth";

const QUERY_KEY = "categories";

export function useCategories() {
  const repo = useFinanceRepository();
  return useQuery<Category[]>({
    queryKey: [QUERY_KEY],
    queryFn: () => repo.listCategories(),
    staleTime: Infinity,
  });
}

export function useCreateCategory() {
  const repo = useFinanceRepository();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CategoryCreate) =>
      repo.createCategory({ ...data, id: crypto.randomUUID() }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: [QUERY_KEY] }),
  });
}

export function useUpdateCategory() {
  const isGuest = useAuthStore((s) => s.isGuest);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: CategoryUpdate }) => {
      if (isGuest) return Promise.resolve({} as Category);
      return updateCategory(id, data);
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: [QUERY_KEY] }),
  });
}

export function useArchiveCategory() {
  const isGuest = useAuthStore((s) => s.isGuest);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => {
      if (isGuest) return Promise.resolve();
      return archiveCategory(id);
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: [QUERY_KEY] }),
  });
}
