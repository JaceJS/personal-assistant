import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

import {
  createAITypingMessage,
  createUserTextMessage,
  rejectAIMessage,
  resolveAIMessage,
} from '@/features/finance/utils/chatMessageUtils';
import type { AIMessage, Message } from '@/features/finance/utils/chatMessageUtils';
import { getChatSessionMessages, postChatMessage, type DraftTransaction } from '@/features/ai/api/chat';

const CHAT_SESSION_KEY = 'chat_session_id';

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);
  const [pendingDraft, setPendingDraft] = useState<DraftTransaction | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const storedId = await AsyncStorage.getItem(CHAT_SESSION_KEY);
        if (!storedId || cancelled) return;
        setSessionId(storedId);
        const { messages: history } = await getChatSessionMessages(storedId);
        if (cancelled) return;
        setMessages(
          history.map((m) =>
            m.role === 'user'
              ? ({
                  id: m.id,
                  type: 'user' as const,
                  content: m.content,
                  createdAt: new Date(m.created_at),
                })
              : ({
                  id: m.id,
                  type: 'ai' as const,
                  content: m.content,
                  isTyping: false,
                  createdAt: new Date(m.created_at),
                }),
          ),
        );
      } catch {
        // history not critical — start fresh
      } finally {
        if (!cancelled) setIsLoadingHistory(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const sendMessage = useCallback(
    async (text: string) => {
      const userMsg = createUserTextMessage(text);
      const aiMsg = createAITypingMessage();
      setMessages((prev) => [...prev, userMsg, aiMsg]);
      try {
        const { reply, session_id, draft_transaction } = await postChatMessage(text, sessionId);
        setSessionId(session_id);
        await AsyncStorage.setItem(CHAT_SESSION_KEY, session_id);
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

  return { messages, setMessages, sendMessage, pendingDraft, dismissDraft, isLoadingHistory };
}
