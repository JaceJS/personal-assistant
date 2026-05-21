import { useQuery } from "@tanstack/react-query";
import { listCategories } from "@/features/finance/api/categories";

export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: listCategories,
    staleTime: Infinity,
  });
}
