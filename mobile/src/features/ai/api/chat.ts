import { apiFetch } from '@/lib/api/client';
import type { ApiResponse } from '@/features/finance/types';

export interface DraftTransaction {
  transaction_id: string;
  amount: number;
  currency: string;
  merchant: string | null;
  category_name: string | null;
  note: string | null;
  account_id: string;
}

export async function postChatMessage(
  message: string,
  sessionId?: string,
): Promise<{ reply: string; session_id: string; draft_transaction?: DraftTransaction }> {
  return apiFetch<ApiResponse<{ reply: string; session_id: string; draft_transaction?: DraftTransaction }>>(
    '/api/v1/ai/chat',
    {
      method: 'POST',
      body: JSON.stringify({ message, session_id: sessionId }),
    },
  ).then((r) => r.data);
}

export interface ChatMessageRecord {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

export async function getChatSessionMessages(
  sessionId: string,
): Promise<{ session_id: string; messages: ChatMessageRecord[] }> {
  return apiFetch<ApiResponse<{ session_id: string; messages: ChatMessageRecord[] }>>(
    `/api/v1/ai/sessions/${sessionId}/messages`,
  ).then((r) => r.data);
}

export async function confirmAiDraft(
  transactionId: string,
  payload: {
    amount: number;
    account_id: string | null;
    category_id: string | null;
    merchant: string | null;
    note: string | null;
  },
): Promise<void> {
  await apiFetch(`/api/v1/transactions/${transactionId}`, {
    method: 'PATCH',
    body: JSON.stringify({ status: 'confirmed', ...payload }),
  });
}
