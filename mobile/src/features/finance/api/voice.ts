import { apiFetch } from "@/lib/api/client";
import type { ApiResponse } from "@/features/finance/types";

export interface ExtractedTransaction {
  amount: number;
  currency: string;
  merchant: string | null;
  category_name: string | null;
  note: string | null;
  confidence: number;
}

export type VoiceProcessingStatus =
  | "pending"
  | "transcribing"
  | "extracting"
  | "completed"
  | "failed";

export interface VoiceUploadResponse {
  voice_log_id: string;
  status: VoiceProcessingStatus;
}

export interface VoiceStatusResponse {
  id: string;
  status: VoiceProcessingStatus;
  transcript: string | null;
  extracted_data: ExtractedTransaction | null;
  transaction_id: string | null;
  error_message: string | null;
}

export async function uploadAudio(
  audioUri: string,
  accountId: string
): Promise<VoiceUploadResponse> {
  const formData = new FormData();
  formData.append("file", {
    uri: audioUri,
    name: "recording.m4a",
    type: "audio/m4a",
  } as unknown as Blob);
  formData.append("account_id", accountId);

  return apiFetch<ApiResponse<VoiceUploadResponse>>("/api/v1/voice/upload", {
    method: "POST",
    body: formData,
  }).then((r) => r.data);
}

export async function getVoiceStatus(voiceLogId: string): Promise<VoiceStatusResponse> {
  return apiFetch<ApiResponse<VoiceStatusResponse>>(`/api/v1/voice/${voiceLogId}`)
    .then((r) => r.data);
}
