import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createCategory, listCategories } from "@/features/finance/api/categories";
import type { Category, CategoryCreate } from "@/features/finance/types";

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
