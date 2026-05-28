import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createTransaction,
  deleteTransaction,
  getTransaction,
  listTransactions,
  updateTransaction,
} from "@/features/finance/api/transactions";
import type { ListTransactionsParams } from "@/features/finance/api/transactions";
import type { TransactionCreate, TransactionUpdate } from "@/features/finance/types";

const QUERY_KEY = "transactions";

export function useTransactions(params?: ListTransactionsParams) {
  return useQuery({
    queryKey: [QUERY_KEY, params ?? null],
    queryFn: () => listTransactions(params),
  });
}

export function useTransaction(id: string) {
  return useQuery({
    queryKey: [QUERY_KEY, id],
    queryFn: () => getTransaction(id),
    enabled: !!id,
  });
}

export function useCreateTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: TransactionCreate) => createTransaction(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
}

export function useUpdateTransaction(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: TransactionUpdate) => updateTransaction(id, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteTransaction(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
}
