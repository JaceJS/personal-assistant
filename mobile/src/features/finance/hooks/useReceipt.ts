import { useMutation, useQueries, useQuery } from "@tanstack/react-query";

import { getReceiptStatus, uploadReceipt } from "@/features/finance/api/receipt";
import type { ReceiptStatusResponse } from "@/features/finance/api/receipt";

const RECEIPT_QUERY_KEY = "receipt";

function receiptRefetchInterval(query: { state: { data?: ReceiptStatusResponse } }) {
  const status = query.state.data?.status;
  return status === "completed" || status === "failed" ? false : 1500;
}

export function useUploadReceipt() {
  return useMutation({
    mutationFn: ({
      imageUri,
      accountId,
      chatSessionId,
    }: {
      imageUri: string;
      accountId: string;
      chatSessionId?: string;
    }) => uploadReceipt(imageUri, accountId, chatSessionId),
    retry: false,
  });
}

export function useReceiptStatus(receiptLogId: string | null) {
  return useQuery({
    queryKey: [RECEIPT_QUERY_KEY, receiptLogId],
    queryFn: () => getReceiptStatus(receiptLogId as string),
    enabled: receiptLogId !== null,
    refetchInterval: receiptRefetchInterval,
  });
}

export function useReceiptStatuses(receiptLogIds: string[]) {
  return useQueries({
    queries: receiptLogIds.map((id) => ({
      queryKey: [RECEIPT_QUERY_KEY, id],
      queryFn: () => getReceiptStatus(id),
      refetchInterval: receiptRefetchInterval,
    })),
  });
}
