import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";

import {
  createAITypingMessage,
  createDraftMessages,
  createUserTextMessage,
  mergeMessagesSorted,
  rejectAIMessage,
  resolveAIMessage,
} from "@/features/finance/utils/chatMessageUtils";
import type { AIMessage, Message, UserTextMessage } from "@/features/finance/utils/chatMessageUtils";
import { deleteChatMessage, getChatSessionMessages, postChatMessage } from "@/features/ai/api/chat";
import { postGuestChatMessage, toGuestAccountSnapshots } from "@/features/ai/api/guestChat";
import type { GuestChatHistoryItem } from "@/features/ai/api/guestChat";
import {
  clearChatMediaMessages,
  loadChatMediaMessages,
  saveChatMediaMessages,
} from "@/features/ai/repository/chatMediaStorage";
import {
  clearGuestChatMessages,
  loadGuestChatMessages,
  saveGuestChatMessages,
} from "@/features/ai/repository/guestChatStorage";
import type { Account } from "@/features/finance/types";
import { ApiError } from "@/lib/api/client";
import { getOrCreateGuestDeviceId } from "@/lib/guestDeviceId";
import { useAuthStore } from "@/stores/auth";

export const CHAT_SESSION_KEY = "chat_session_id";

// Guest trial size is enforced server-side (see backend ai/router.py
// _GUEST_AI_LIFETIME_LIMIT) — this is only a local starting value so the UI
// has something to show before the first guest message resolves.
const GUEST_QUOTA_UNKNOWN = null;

export function useChat(accounts: Account[] = []) {
  const isGuest = useAuthStore((s) => s.isGuest);
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [guestDeviceId, setGuestDeviceId] = useState<string | null>(null);
  const [guestQuota, setGuestQuota] = useState<number | null>(GUEST_QUOTA_UNKNOWN);

  useEffect(() => {
    if (isGuest) {
      setIsLoadingHistory(false);
      setMessages(loadGuestChatMessages());
      setSessionId(undefined);
      void getOrCreateGuestDeviceId().then(setGuestDeviceId);
      return;
    }

    clearGuestChatMessages();

    let cancelled = false;
    (async () => {
      try {
        const storedId = await AsyncStorage.getItem(CHAT_SESSION_KEY);
        if (!storedId || cancelled) return;
        setSessionId(storedId);
        const [{ messages: history, draft_transactions }, cachedMedia] = await Promise.all([
          getChatSessionMessages(storedId),
          loadChatMediaMessages(storedId),
        ]);
        if (cancelled) return;
        const textMessages: Message[] = history
          .filter((m) => m.role === "user" || m.content.length > 0)
          .map((m) =>
            m.role === "user"
              ? {
                  id: m.id,
                  type: "user" as const,
                  content: m.content,
                  status: "sent" as const,
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
          );
        setMessages(
          mergeMessagesSorted(textMessages, [...createDraftMessages(draft_transactions), ...cachedMedia])
        );
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

  useEffect(() => {
    if (!isGuest) return;
    saveGuestChatMessages(messages);
  }, [isGuest, messages]);

  useEffect(() => {
    if (isGuest || !sessionId) return;
    void saveChatMediaMessages(sessionId, messages);
  }, [isGuest, sessionId, messages]);

  const syncSessionId = useCallback(async (id: string) => {
    setSessionId(id);
    await AsyncStorage.setItem(CHAT_SESSION_KEY, id);
  }, []);

  // Nothing is persisted server-side for a guest turn, so there's no session
  // to replay from — the recent in-memory history is resent every time
  // instead (bounded, since it's included in every request body).
  const GUEST_HISTORY_TURNS = 10;

  const dispatchGuest = useCallback(
    async (text: string, userMsgId: string, aiMsg: AIMessage) => {
      const tagUserMsg = (m: Message) =>
        m.id === userMsgId ? { ...(m as UserTextMessage), status: "sent" as const } : m;
      try {
        if (!guestDeviceId) throw new Error("Guest device id not ready yet");
        const history: GuestChatHistoryItem[] = messages
          .filter((m): m is UserTextMessage | AIMessage => m.type === "user" || m.type === "ai")
          .slice(-GUEST_HISTORY_TURNS)
          .map((m) => ({
            role: m.type === "user" ? ("user" as const) : ("assistant" as const),
            content: m.type === "user" ? m.content : (m.content ?? ""),
          }));

        const { reply, draft_transactions, remaining_quota } = await postGuestChatMessage(
          text,
          guestDeviceId,
          toGuestAccountSnapshots(accounts),
          history
        );
        setGuestQuota(remaining_quota);
        setMessages((prev) =>
          mergeMessagesSorted(
            reply
              ? prev.map((m) =>
                  m.id === aiMsg.id ? resolveAIMessage(m as AIMessage, reply) : tagUserMsg(m)
                )
              : prev.filter((m) => m.id !== aiMsg.id).map(tagUserMsg),
            createDraftMessages(draft_transactions ?? [])
          )
        );
      } catch (err) {
        if (err instanceof ApiError && err.status === 429) setGuestQuota(0);
        setMessages((prev) =>
          prev.map((m) => {
            if (m.id === aiMsg.id) {
              return rejectAIMessage(m as AIMessage, "Could not get a response. Please try again.");
            }
            if (m.id === userMsgId) {
              return { ...(m as UserTextMessage), status: "failed" as const };
            }
            return m;
          })
        );
      }
    },
    [accounts, guestDeviceId, messages]
  );

  const dispatch = useCallback(
    async (text: string, userMsgId: string, aiMsg: AIMessage) => {
      if (isGuest) return dispatchGuest(text, userMsgId, aiMsg);
      try {
        const { reply, session_id, draft_transactions, user_message_id, assistant_message_id } =
          await postChatMessage(text, sessionId);
        await syncSessionId(session_id);
        const tagUserMsg = (m: Message) =>
          m.id === userMsgId
            ? { ...(m as UserTextMessage), remoteId: user_message_id, status: "sent" as const }
            : m;
        setMessages((prev) =>
          mergeMessagesSorted(
            reply
              ? prev.map((m) =>
                  m.id === aiMsg.id
                    ? resolveAIMessage(m as AIMessage, reply, assistant_message_id)
                    : tagUserMsg(m)
                )
              : prev.filter((m) => m.id !== aiMsg.id).map(tagUserMsg),
            createDraftMessages(draft_transactions ?? [])
          )
        );
      } catch {
        setMessages((prev) =>
          prev.map((m) => {
            if (m.id === aiMsg.id) {
              return rejectAIMessage(m as AIMessage, "Could not get a response. Please try again.");
            }
            if (m.id === userMsgId) {
              return { ...(m as UserTextMessage), status: "failed" as const };
            }
            return m;
          })
        );
      }
    },
    [isGuest, dispatchGuest, sessionId, syncSessionId]
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
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id === failedMsg.id) return aiMsg;
          if (m.id === userMsgId) return { ...(m as UserTextMessage), status: "sending" as const };
          return m;
        })
      );
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
    if (sessionId) await clearChatMediaMessages(sessionId);
    setSessionId(undefined);
    await AsyncStorage.removeItem(CHAT_SESSION_KEY);
  }, [sessionId]);

  return {
    messages,
    setMessages,
    sessionId,
    syncSessionId,
    sendMessage,
    retryMessage,
    deleteMessage,
    isLoadingHistory,
    clearChat,
    guestQuota,
  };
}
