import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createAccount, getAccount, listAccounts } from "@/features/finance/api/accounts";
import type { AccountCreate } from "@/features/finance/types";

const QUERY_KEY = "accounts";

export function useAccounts() {
  return useQuery({
    queryKey: [QUERY_KEY],
    queryFn: listAccounts,
  });
}

export function useAccount(id: string) {
  return useQuery({
    queryKey: [QUERY_KEY, id],
    queryFn: () => getAccount(id),
    enabled: !!id,
  });
}

export function useCreateAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: AccountCreate) => createAccount(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
}
