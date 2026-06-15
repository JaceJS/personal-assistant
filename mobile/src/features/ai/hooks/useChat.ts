import { useCallback, useState } from 'react';

import {
  createAITypingMessage,
  createUserTextMessage,
  rejectAIMessage,
  resolveAIMessage,
} from '@/features/finance/utils/chatMessageUtils';
import type { AIMessage, Message } from '@/features/finance/utils/chatMessageUtils';
import { postChatMessage, type DraftTransaction } from '@/features/ai/api/chat';

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);
  const [pendingDraft, setPendingDraft] = useState<DraftTransaction | null>(null);

  const sendMessage = useCallback(
    async (text: string) => {
      const userMsg = createUserTextMessage(text);
      const aiMsg = createAITypingMessage();
      setMessages((prev) => [...prev, userMsg, aiMsg]);
      try {
        const { reply, session_id, draft_transaction } = await postChatMessage(text, sessionId);
        setSessionId(session_id);
        setMessages((prev) =>
          prev.map((m) => (m.id === aiMsg.id ? resolveAIMessage(m as AIMessage, reply) : m))
        );
        if (draft_transaction) {
          setPendingDraft(draft_transaction);
        }
      } catch {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === aiMsg.id
              ? rejectAIMessage(m as AIMessage, 'Could not get a response. Please try again.')
              : m
          )
        );
      }
    },
    [sessionId],
  );

  const dismissDraft = useCallback(() => setPendingDraft(null), []);

  return { messages, setMessages, sendMessage, pendingDraft, dismissDraft };
}
