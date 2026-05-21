// TODO: Backend voice endpoints not yet implemented.
// POST /api/v1/voice/upload  — returns { voice_log_id: string }
// GET  /api/v1/voice/{id}    — returns { status: string, transaction?: ExtractedTransaction }

import { apiFetch } from "@/lib/api/client";

export interface ExtractedTransaction {
  amount: number;
  currency: string;
  merchant: string | null;
  category_name: string | null;
  note: string | null;
  confidence: number;
}

export interface VoiceStatusResponse {
  status: "pending" | "transcribing" | "extracting" | "completed" | "failed";
  transaction: ExtractedTransaction | null;
  error_message: string | null;
}

export async function uploadAudio(
  audioUri: string,
  accountId: string
): Promise<{ voice_log_id: string }> {
  const formData = new FormData();
  formData.append("file", {
    uri: audioUri,
    name: "recording.m4a",
    type: "audio/m4a",
  } as unknown as Blob);
  formData.append("account_id", accountId);

  return apiFetch<{ voice_log_id: string }>("/api/v1/voice/upload", {
    method: "POST",
    headers: { "Content-Type": "multipart/form-data" },
    body: formData,
  });
}

export async function getVoiceStatus(voiceLogId: string): Promise<VoiceStatusResponse> {
  return apiFetch<VoiceStatusResponse>(`/api/v1/voice/${voiceLogId}`);
}
