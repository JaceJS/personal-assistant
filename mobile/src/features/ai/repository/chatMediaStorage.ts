import AsyncStorage from "@react-native-async-storage/async-storage";

import { extractMediaMessages } from "@/features/finance/utils/chatMessageUtils";
import type { ChatMessage, Message } from "@/features/finance/utils/chatMessageUtils";

const KEY_PREFIX = "chat_media_";

export async function saveChatMediaMessages(sessionId: string, messages: Message[]): Promise<void> {
  await AsyncStorage.setItem(`${KEY_PREFIX}${sessionId}`, JSON.stringify(extractMediaMessages(messages)));
}

export async function loadChatMediaMessages(sessionId: string): Promise<ChatMessage[]> {
  const raw = await AsyncStorage.getItem(`${KEY_PREFIX}${sessionId}`);
  if (!raw) return [];
  const parsed = JSON.parse(raw) as ChatMessage[];
  return parsed.map((m) => ({ ...m, createdAt: new Date(m.createdAt) }));
}

export async function clearChatMediaMessages(sessionId: string): Promise<void> {
  await AsyncStorage.removeItem(`${KEY_PREFIX}${sessionId}`);
}
