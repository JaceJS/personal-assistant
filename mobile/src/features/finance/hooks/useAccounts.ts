import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  archiveAccount,
  createAccount,
  getAccount,
  listAccounts,
  updateAccount,
} from "@/features/finance/api/accounts";
import type { AccountCreate, AccountUpdate } from "@/features/finance/types";

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
    retry: false,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: [QUERY_KEY] }),
  });
}

export function useUpdateAccount(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: AccountUpdate) => updateAccount(id, data),
    retry: false,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      void queryClient.invalidateQueries({ queryKey: [QUERY_KEY, id] });
    },
  });
}

export function useArchiveAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => archiveAccount(id),
    retry: false,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: [QUERY_KEY] }),
  });
}
