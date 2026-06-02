import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getReceiptStatus, uploadReceipt } from "@/features/finance/api/receipt";
import type { ReceiptStatusResponse } from "@/features/finance/api/receipt";
import { updateTransaction } from "@/features/finance/api/transactions";

const RECEIPT_QUERY_KEY = "receipt";
const TRANSACTIONS_QUERY_KEY = "transactions";
const ACCOUNTS_QUERY_KEY = "accounts";

export function useUploadReceipt() {
  return useMutation({
    mutationFn: ({ imageUri, accountId }: { imageUri: string; accountId: string }) =>
      uploadReceipt(imageUri, accountId),
    retry: false,
  });
}

export function useReceiptStatus(receiptLogId: string | null) {
  return useQuery({
    queryKey: [RECEIPT_QUERY_KEY, receiptLogId],
    queryFn: () => getReceiptStatus(receiptLogId as string),
    enabled: receiptLogId !== null,
    refetchInterval: (query) => {
      const data = query.state.data as ReceiptStatusResponse | undefined;
      const status = data?.status;
      if (status === "completed" || status === "failed") return false;
      return 1500;
    },
  });
}

interface ConfirmReceiptInput {
  transactionId: string;
  amount: number;
  accountId: string | null;
  categoryId: string | null;
  merchant: string | null;
  note: string | null;
}

export function useConfirmReceiptTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ transactionId, amount, accountId, categoryId, merchant, note }: ConfirmReceiptInput) =>
      updateTransaction(transactionId, {
        status: "confirmed",
        amount,
        account_id: accountId,
        category_id: categoryId,
        merchant,
        note,
      }),
    retry: false,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [TRANSACTIONS_QUERY_KEY] });
      void queryClient.invalidateQueries({ queryKey: [ACCOUNTS_QUERY_KEY] });
    },
  });
}
