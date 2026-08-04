import { apiFetch } from '@/lib/api/client';
import type { ApiResponse, TransactionStatus } from '@/features/finance/types';

export interface DraftTransaction {
  transaction_id: string;
  amount: number;
  currency: string;
  merchant: string | null;
  category_name: string | null;
  note: string | null;
  account_id: string;
  status: TransactionStatus;
  created_at: string;
}

export interface ChatReply {
  reply: string;
  session_id: string;
  user_message_id: string;
  assistant_message_id: string;
  draft_transactions: DraftTransaction[];
}

export async function postChatMessage(
  message: string,
  sessionId?: string,
): Promise<ChatReply> {
  return apiFetch<ApiResponse<ChatReply>>(
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

export interface ChatSessionHistory {
  session_id: string;
  messages: ChatMessageRecord[];
  draft_transactions: DraftTransaction[];
}

export async function getChatSessionMessages(sessionId: string): Promise<ChatSessionHistory> {
  return apiFetch<ApiResponse<ChatSessionHistory>>(
    `/api/v1/ai/sessions/${sessionId}/messages`,
  ).then((r) => r.data);
}

export async function deleteChatMessage(sessionId: string, messageId: string): Promise<void> {
  await apiFetch(`/api/v1/ai/sessions/${sessionId}/messages/${messageId}`, {
    method: 'DELETE',
  });
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
