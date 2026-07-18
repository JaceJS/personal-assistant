import { useMutation, useQuery } from "@tanstack/react-query";

import { getReceiptStatus, uploadReceipt } from "@/features/finance/api/receipt";
import type { ReceiptStatusResponse } from "@/features/finance/api/receipt";

const RECEIPT_QUERY_KEY = "receipt";

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
