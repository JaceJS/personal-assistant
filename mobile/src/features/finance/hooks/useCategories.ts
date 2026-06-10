import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { archiveCategory, createCategory, listCategories, updateCategory } from "@/features/finance/api/categories";
import type { Category, CategoryCreate, CategoryUpdate } from "@/features/finance/types";

const QUERY_KEY = "categories";

export function useCategories() {
  return useQuery<Category[]>({
    queryKey: [QUERY_KEY],
    queryFn: listCategories,
    staleTime: Infinity,
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CategoryCreate) => createCategory(data),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: [QUERY_KEY] }),
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: CategoryUpdate }) => updateCategory(id, data),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: [QUERY_KEY] }),
  });
}

export function useArchiveCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => archiveCategory(id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: [QUERY_KEY] }),
  });
}
