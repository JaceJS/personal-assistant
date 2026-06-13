import { useCallback, useState } from 'react';

import {
  createAITypingMessage,
  createUserTextMessage,
  rejectAIMessage,
  resolveAIMessage,
} from '@/features/finance/utils/chatMessageUtils';
import type { AIMessage, Message } from '@/features/finance/utils/chatMessageUtils';
import { postChatMessage } from '@/features/ai/api/chat';

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([]);

  const sendMessage = useCallback(async (text: string) => {
    const userMsg = createUserTextMessage(text);
    const aiTyping = createAITypingMessage();
    setMessages((prev) => [...prev, userMsg, aiTyping]);
    try {
      const { reply } = await postChatMessage(text);
      setMessages((prev) =>
        prev.map((m) => (m.id === aiTyping.id ? resolveAIMessage(m as AIMessage, reply) : m))
      );
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === aiTyping.id
            ? rejectAIMessage(m as AIMessage, 'Could not get a response. Please try again.')
            : m
        )
      );
    }
  }, []);

  return { messages, setMessages, sendMessage };
}
