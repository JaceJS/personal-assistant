import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";

import {
  createAITypingMessage,
  createDraftMessages,
  createUserTextMessage,
  rejectAIMessage,
  resolveAIMessage,
} from "@/features/finance/utils/chatMessageUtils";
import type { AIMessage, Message } from "@/features/finance/utils/chatMessageUtils";
import { getChatSessionMessages, postChatMessage } from "@/features/ai/api/chat";
import { useAuthStore } from "@/stores/auth";

const CHAT_SESSION_KEY = "chat_session_id";

export function useChat() {
  const isGuest = useAuthStore((s) => s.isGuest);
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  useEffect(() => {
    if (isGuest) {
      setIsLoadingHistory(false);
      setMessages([]);
      setSessionId(undefined);
      void AsyncStorage.removeItem(CHAT_SESSION_KEY);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const storedId = await AsyncStorage.getItem(CHAT_SESSION_KEY);
        if (!storedId || cancelled) return;
        setSessionId(storedId);
        const { messages: history, draft_transactions } = await getChatSessionMessages(storedId);
        if (cancelled) return;
        setMessages([
          ...history
            .filter((m) => m.role === "user" || m.content.length > 0)
            .map((m) =>
              m.role === "user"
                ? {
                    id: m.id,
                    type: "user" as const,
                    content: m.content,
                    createdAt: new Date(m.created_at),
                  }
                : {
                    id: m.id,
                    type: "ai" as const,
                    content: m.content,
                    isTyping: false,
                    skipTypewriter: true,
                    createdAt: new Date(m.created_at),
                  }
            ),
          ...createDraftMessages(draft_transactions),
        ]);
      } catch {
        // history not critical, start fresh
      } finally {
        if (!cancelled) setIsLoadingHistory(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isGuest]);

  const dispatch = useCallback(
    async (text: string, aiMsg: AIMessage) => {
      try {
        const { reply, session_id, draft_transactions } = await postChatMessage(text, sessionId);
        setSessionId(session_id);
        await AsyncStorage.setItem(CHAT_SESSION_KEY, session_id);
        setMessages((prev) => [
          ...(reply
            ? prev.map((m) => (m.id === aiMsg.id ? resolveAIMessage(m as AIMessage, reply) : m))
            : prev.filter((m) => m.id !== aiMsg.id)),
          ...createDraftMessages(draft_transactions ?? []),
        ]);
      } catch {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === aiMsg.id
              ? rejectAIMessage(m as AIMessage, "Could not get a response. Please try again.")
              : m
          )
        );
      }
    },
    [sessionId]
  );

  const sendMessage = useCallback(
    async (text: string) => {
      const userMsg = createUserTextMessage(text);
      const aiMsg = createAITypingMessage(text);
      setMessages((prev) => [...prev, userMsg, aiMsg]);
      await dispatch(text, aiMsg);
    },
    [dispatch]
  );

  const retryMessage = useCallback(
    async (failedMsg: AIMessage) => {
      if (!failedMsg.originalText) return;
      const aiMsg = createAITypingMessage(failedMsg.originalText);
      setMessages((prev) => prev.map((m) => (m.id === failedMsg.id ? aiMsg : m)));
      await dispatch(failedMsg.originalText, aiMsg);
    },
    [dispatch]
  );

  const clearChat = useCallback(async () => {
    setMessages([]);
    setSessionId(undefined);
    await AsyncStorage.removeItem(CHAT_SESSION_KEY);
  }, []);

  return { messages, setMessages, sendMessage, retryMessage, isLoadingHistory, clearChat };
}
