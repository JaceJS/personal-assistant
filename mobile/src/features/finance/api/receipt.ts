import { apiFetch } from "@/lib/api/client";
import type { ApiResponse } from "@/features/finance/types";
import type { ExtractedTransaction, VoiceProcessingStatus } from "@/features/finance/api/voice";

export interface ReceiptUploadResponse {
  receipt_log_id: string;
  status: VoiceProcessingStatus;
  chat_session_id: string;
}

export interface ReceiptStatusResponse {
  id: string;
  status: VoiceProcessingStatus;
  extracted_data: ExtractedTransaction[];
  transaction_ids: string[];
  error_message: string | null;
}

export async function uploadReceipt(
  imageUri: string,
  accountId: string,
  chatSessionId?: string
): Promise<ReceiptUploadResponse> {
  const formData = new FormData();
  formData.append("file", {
    uri: imageUri,
    name: "receipt.jpg",
    type: "image/jpeg",
  } as unknown as Blob);
  formData.append("account_id", accountId);
  if (chatSessionId) formData.append("chat_session_id", chatSessionId);

  return apiFetch<ApiResponse<ReceiptUploadResponse>>("/api/v1/receipt/upload", {
    method: "POST",
    body: formData,
  }).then((r) => r.data);
}

export async function getReceiptStatus(receiptLogId: string): Promise<ReceiptStatusResponse> {
  return apiFetch<ApiResponse<ReceiptStatusResponse>>(`/api/v1/receipt/${receiptLogId}`)
    .then((r) => r.data);
}
