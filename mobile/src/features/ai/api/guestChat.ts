import { apiFetch } from '@/lib/api/client';
import type { ApiResponse } from '@/features/finance/types';
import type { Account } from '@/features/finance/types';
import type { DraftTransaction } from './chat';

export interface GuestAccountSnapshot {
  id: string;
  name: string;
  balance: number;
  currency: string;
}

export interface GuestChatHistoryItem {
  role: 'user' | 'assistant';
  content: string;
}

export interface GuestChatReply {
  reply: string;
  draft_transactions: DraftTransaction[];
  remaining_quota: number;
}

// Guest accounts live only in local SQLite, so the client resends a snapshot
// of them on every request instead of the backend reading Postgres by user_id.
export function toGuestAccountSnapshots(accounts: Account[]): GuestAccountSnapshot[] {
  return accounts
    .filter((a) => !a.is_archived)
    .map((a) => ({ id: a.id, name: a.name, balance: a.balance, currency: a.currency }));
}

export async function postGuestChatMessage(
  message: string,
  deviceId: string,
  accounts: GuestAccountSnapshot[],
  history: GuestChatHistoryItem[] = [],
): Promise<GuestChatReply> {
  return apiFetch<ApiResponse<GuestChatReply>>(
    '/api/v1/ai/guest-chat',
    {
      method: 'POST',
      headers: { 'X-Device-Id': deviceId },
      body: JSON.stringify({ message, accounts, history }),
    },
  ).then((r) => r.data);
}
