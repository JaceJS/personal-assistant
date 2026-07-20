import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";

import {
  createAITypingMessage,
  createDraftMessages,
  createUserTextMessage,
  rejectAIMessage,
  resolveAIMessage,
} from "@/features/finance/utils/chatMessageUtils";
import type { AIMessage, Message, UserTextMessage } from "@/features/finance/utils/chatMessageUtils";
import { deleteChatMessage, getChatSessionMessages, postChatMessage } from "@/features/ai/api/chat";
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
                    remoteId: m.id,
                  }
                : {
                    id: m.id,
                    type: "ai" as const,
                    content: m.content,
                    isTyping: false,
                    skipTypewriter: true,
                    createdAt: new Date(m.created_at),
                    remoteId: m.id,
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
    async (text: string, userMsgId: string, aiMsg: AIMessage) => {
      try {
        const { reply, session_id, draft_transactions, user_message_id, assistant_message_id } =
          await postChatMessage(text, sessionId);
        setSessionId(session_id);
        await AsyncStorage.setItem(CHAT_SESSION_KEY, session_id);
        const tagUserMsg = (m: Message) =>
          m.id === userMsgId ? { ...(m as UserTextMessage), remoteId: user_message_id } : m;
        setMessages((prev) => [
          ...(reply
            ? prev.map((m) =>
                m.id === aiMsg.id
                  ? resolveAIMessage(m as AIMessage, reply, assistant_message_id)
                  : tagUserMsg(m)
              )
            : prev.filter((m) => m.id !== aiMsg.id).map(tagUserMsg)),
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
      await dispatch(text, userMsg.id, aiMsg);
    },
    [dispatch]
  );

  const retryMessage = useCallback(
    async (failedMsg: AIMessage) => {
      if (!failedMsg.originalText) return;
      const idx = messages.findIndex((m) => m.id === failedMsg.id);
      const precedingMsg = idx > 0 ? messages[idx - 1] : undefined;
      const userMsgId =
        precedingMsg && precedingMsg.type === "user" ? precedingMsg.id : failedMsg.id;
      const aiMsg = createAITypingMessage(failedMsg.originalText);
      setMessages((prev) => prev.map((m) => (m.id === failedMsg.id ? aiMsg : m)));
      await dispatch(failedMsg.originalText, userMsgId, aiMsg);
    },
    [dispatch, messages]
  );

  const deleteMessage = useCallback(async (message: Message) => {
    const remoteId = "remoteId" in message ? message.remoteId : undefined;
    if (remoteId && sessionId) {
      await deleteChatMessage(sessionId, remoteId);
    }
    setMessages((prev) => prev.filter((m) => m.id !== message.id));
  }, [sessionId]);

  const clearChat = useCallback(async () => {
    setMessages([]);
    setSessionId(undefined);
    await AsyncStorage.removeItem(CHAT_SESSION_KEY);
  }, []);

  return {
    messages,
    setMessages,
    sendMessage,
    retryMessage,
    deleteMessage,
    isLoadingHistory,
    clearChat,
  };
}
