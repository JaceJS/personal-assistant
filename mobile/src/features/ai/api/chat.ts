import { apiFetch } from '@/lib/api/client';
import type { ApiResponse } from '@/features/finance/types';

export async function postChatMessage(message: string): Promise<{ reply: string }> {
  return apiFetch<ApiResponse<{ reply: string }>>('/api/v1/ai/chat', {
    method: 'POST',
    body: JSON.stringify({ message }),
  }).then((r) => r.data);
}
