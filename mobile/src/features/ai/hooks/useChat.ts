import { useCallback, useState } from 'react';

import {
  createAITypingMessage,
  createUserTextMessage,
  rejectAIMessage,
  resolveAIMessage,
} from '@/features/finance/utils/chatMessageUtils';
import type { AIMessage, Message } from '@/features/finance/utils/chatMessageUtils';
import { streamChatMessage } from '@/features/ai/api/chat';

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([]);

  const sendMessage = useCallback(async (text: string) => {
    const userMsg = createUserTextMessage(text);
    const aiMsg = createAITypingMessage();
    setMessages((prev) => [...prev, userMsg, aiMsg]);
    let accumulated = '';
    try {
      await streamChatMessage(text, (token) => {
        accumulated += token;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === aiMsg.id
              ? { ...(m as AIMessage), content: accumulated, isTyping: true }
              : m
          )
        );
      });
      setMessages((prev) =>
        prev.map((m) =>
          m.id === aiMsg.id ? resolveAIMessage(m as AIMessage, accumulated) : m
        )
      );
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === aiMsg.id
            ? rejectAIMessage(m as AIMessage, 'Could not get a response. Please try again.')
            : m
        )
      );
    }
  }, []);

  return { messages, setMessages, sendMessage };
}
