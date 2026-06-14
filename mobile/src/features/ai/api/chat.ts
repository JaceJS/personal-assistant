import { apiFetch, streamFetch } from '@/lib/api/client';
import type { ApiResponse } from '@/features/finance/types';
import { parseSseLines } from '@/features/ai/utils/sseUtils';

export async function postChatMessage(message: string): Promise<{ reply: string }> {
  return apiFetch<ApiResponse<{ reply: string }>>('/api/v1/ai/chat', {
    method: 'POST',
    body: JSON.stringify({ message }),
  }).then((r) => r.data);
}

export async function streamChatMessage(
  message: string,
  onToken: (token: string) => void,
): Promise<void> {
  let buffer = '';
  let streamDone = false;

  await streamFetch(
    '/api/v1/ai/chat/stream',
    { method: 'POST', body: JSON.stringify({ message }) },
    (chunk) => {
      if (streamDone) return;
      buffer += chunk;
      const { tokens, done, rest } = parseSseLines(buffer);
      buffer = rest;
      for (const token of tokens) {
        onToken(token);
      }
      if (done) streamDone = true;
    },
  );
}
