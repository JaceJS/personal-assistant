import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useFinanceRepository } from "@/features/finance/repository";
import type { ListTransactionsParams } from "@/features/finance/api/transactions";
import type { TransactionCreate, TransactionUpdate } from "@/features/finance/types";

const QUERY_KEY = "transactions";

export function useTransactions(params?: ListTransactionsParams) {
  const repo = useFinanceRepository();
  const resolvedParams: ListTransactionsParams = { status: "confirmed", ...params };
  return useQuery({
    queryKey: [QUERY_KEY, resolvedParams],
    queryFn: () =>
      repo.listTransactions({
        accountId: resolvedParams.accountId,
        limit: resolvedParams.limit,
        offset: resolvedParams.offset,
      }),
  });
}

export function useTransaction(id: string) {
  const repo = useFinanceRepository();
  return useQuery({
    queryKey: [QUERY_KEY, id],
    queryFn: () => repo.getTransaction(id),
    enabled: !!id,
  });
}

export function useCreateTransaction() {
  const repo = useFinanceRepository();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: TransactionCreate) =>
      repo.createTransaction({ ...data, id: crypto.randomUUID() }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: [QUERY_KEY] }),
  });
}

export function useUpdateTransaction(id: string) {
  const repo = useFinanceRepository();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: TransactionUpdate) => repo.updateTransaction(id, data),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: [QUERY_KEY] }),
  });
}

export function useDeleteTransaction() {
  const repo = useFinanceRepository();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => repo.deleteTransaction(id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: [QUERY_KEY] }),
  });
}
