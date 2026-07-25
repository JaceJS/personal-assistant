import { generateId } from '@/lib/utils';

import type { ExtractedTransaction, VoiceProcessingStatus, VoiceStatusResponse } from '@/features/finance/api/voice';
import type { ReceiptStatusResponse } from '@/features/finance/api/receipt';
import type { DraftTransaction } from '@/features/ai/api/chat';

export type ChatMessage = {
  id: string;
  type: 'voice' | 'receipt';
  status: VoiceProcessingStatus;
  transcript?: string;
  extractedData?: ExtractedTransaction[];
  errorMessage?: string;
  // Local audio/image URI + account, kept so a failed upload can be retried
  // without re-recording.
  localUri?: string;
  accountId?: string;
  createdAt: Date;
};

export type UserTextMessage = {
  id: string;
  type: 'user';
  content: string;
  createdAt: Date;
  // The chat_messages row id on the backend. Undefined until the send this
  // message belongs to resolves — only messages with a remoteId can be
  // deleted server-side (see useChat's dispatch and deleteMessage).
  remoteId?: string;
};

export type AIMessage = {
  id: string;
  type: 'ai';
  content?: string;
  isTyping: boolean;
  failed?: boolean;
  // The user message this reply is for, kept so a failed send can be retried
  // without the user having to retype it.
  originalText?: string;
  // Set for messages rehydrated from history, so AIBubble renders the text
  // instantly instead of replaying the typewriter animation.
  skipTypewriter?: boolean;
  createdAt: Date;
  // The chat_messages row id on the backend, see UserTextMessage.remoteId.
  remoteId?: string;
};

export type DraftMessageState = 'pending' | 'saving' | 'saved' | 'cancelled';

export type DraftMessage = {
  id: string;
  type: 'draft';
  draft: DraftTransaction;
  state: DraftMessageState;
  createdAt: Date;
};

export type Message = ChatMessage | UserTextMessage | AIMessage | DraftMessage;

export function createVoiceMessage(
  voiceLogId: string,
  localUri?: string,
  accountId?: string,
): ChatMessage {
  return {
    id: voiceLogId,
    type: 'voice',
    status: 'pending',
    localUri,
    accountId,
    createdAt: new Date(),
  };
}

export function createReceiptMessage(
  receiptLogId: string,
  localUri?: string,
  accountId?: string,
): ChatMessage {
  return {
    id: receiptLogId,
    type: 'receipt',
    status: 'pending',
    localUri,
    accountId,
    createdAt: new Date(),
  };
}

export function createFailedUploadMessage(
  type: 'voice' | 'receipt',
  localUri: string,
  accountId: string,
  errorMessage: string,
): ChatMessage {
  return {
    id: generateId(),
    type,
    status: 'failed',
    localUri,
    accountId,
    errorMessage,
    createdAt: new Date(),
  };
}

export function applyVoiceStatus(msg: ChatMessage, status: VoiceStatusResponse): ChatMessage {
  return {
    ...msg,
    status: status.status,
    transcript: status.transcript ?? msg.transcript,
    extractedData: status.extracted_data.length > 0 ? status.extracted_data : msg.extractedData,
    errorMessage: status.error_message ?? msg.errorMessage,
  };
}

export function applyReceiptStatus(msg: ChatMessage, status: ReceiptStatusResponse): ChatMessage {
  return {
    ...msg,
    status: status.status,
    extractedData: status.extracted_data.length > 0 ? status.extracted_data : msg.extractedData,
    errorMessage: status.error_message ?? msg.errorMessage,
  };
}

export function createUserTextMessage(content: string): UserTextMessage {
  return { id: generateId(), type: 'user', content, createdAt: new Date() };
}

export function createAITypingMessage(originalText: string): AIMessage {
  return { id: generateId(), type: 'ai', isTyping: true, originalText, createdAt: new Date() };
}

export function resolveAIMessage(msg: AIMessage, content: string, remoteId?: string): AIMessage {
  return { ...msg, content, isTyping: false, failed: false, remoteId };
}

export function rejectAIMessage(msg: AIMessage, errorText: string): AIMessage {
  return { ...msg, content: errorText, isTyping: false, failed: true };
}

// Voice/receipt extraction returns two parallel arrays (extracted fields +
// created draft transaction ids, same order) rather than a merged shape, so
// pair them up by index before feeding them into the same DraftMessage/
// DraftTransactionCard machinery the chat flow already uses.
export function extractionToDraftTransactions(
  items: ExtractedTransaction[],
  transactionIds: string[],
  accountId: string,
): DraftTransaction[] {
  return items.slice(0, transactionIds.length).map((item, i) => ({
    transaction_id: transactionIds[i],
    amount: item.amount,
    currency: item.currency,
    merchant: item.merchant,
    category_name: item.category_name,
    note: item.note,
    account_id: accountId,
  }));
}

export function createDraftMessages(drafts: DraftTransaction[]): DraftMessage[] {
  return drafts.map((draft) => ({
    id: draft.transaction_id,
    type: 'draft' as const,
    draft,
    state: 'pending' as const,
    createdAt: new Date(),
  }));
}

export function setDraftState(msg: DraftMessage, state: DraftMessageState): DraftMessage {
  return { ...msg, state };
}

const TERMINAL_STATUSES: VoiceProcessingStatus[] = ['completed', 'failed'];

export function getActiveReceiptIds(messages: Message[]): string[] {
  return messages
    .filter((m): m is ChatMessage => m.type === 'receipt' && !TERMINAL_STATUSES.includes(m.status))
    .map((m) => m.id);
}

// Returns the same array reference when nothing changed, so callers can skip re-rendering.
export function updateMessageIfChanged(
  messages: Message[],
  id: string,
  updater: (msg: ChatMessage) => ChatMessage,
): Message[] {
  let changed = false;
  const next = messages.map((m) => {
    if (m.id !== id || (m.type !== 'receipt' && m.type !== 'voice')) return m;
    const current = m as ChatMessage;
    const updated = updater(current);
    if (
      updated.status !== current.status ||
      updated.errorMessage !== current.errorMessage ||
      updated.extractedData !== current.extractedData
    ) {
      changed = true;
      return updated;
    }
    return m;
  });
  return changed ? next : messages;
}
