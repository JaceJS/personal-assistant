import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as ExpoCrypto from "expo-crypto";
import { useFinanceRepository } from "@/features/finance/repository";
import { useAuthStore } from "@/stores/auth";
import type { AccountCreate, AccountUpdate } from "@/features/finance/types";

const QUERY_KEY = "accounts";

export function useAccounts() {
  const repo = useFinanceRepository();
  const initialized = useAuthStore((s) => s.initialized);
  const isGuest = useAuthStore((s) => s.isGuest);
  return useQuery({
    queryKey: [QUERY_KEY],
    queryFn: () => repo.listAccounts(),
    enabled: initialized && !isGuest,
  });
}

export function useAccount(id: string) {
  const repo = useFinanceRepository();
  const initialized = useAuthStore((s) => s.initialized);
  const isGuest = useAuthStore((s) => s.isGuest);
  return useQuery({
    queryKey: [QUERY_KEY, id],
    queryFn: () => repo.getAccount(id),
    enabled: initialized && !isGuest && !!id,
  });
}

export function useCreateAccount() {
  const repo = useFinanceRepository();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: AccountCreate) =>
      repo.createAccount({ ...data, id: ExpoCrypto.randomUUID() }),
    retry: false,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: [QUERY_KEY] }),
  });
}

export function useUpdateAccount(id: string) {
  const repo = useFinanceRepository();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: AccountUpdate) => repo.updateAccount(id, data),
    retry: false,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      void queryClient.invalidateQueries({ queryKey: [QUERY_KEY, id] });
    },
  });
}

export function useArchiveAccount() {
  const repo = useFinanceRepository();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => repo.updateAccount(id, { is_archived: true }),
    retry: false,
    onSuccess: (_data, id) => {
      void queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      void queryClient.invalidateQueries({ queryKey: [QUERY_KEY, id] });
    },
  });
}
