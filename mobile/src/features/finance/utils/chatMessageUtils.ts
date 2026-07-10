import { generateId } from '@/lib/utils';

import type { ExtractedTransaction, VoiceProcessingStatus, VoiceStatusResponse } from '@/features/finance/api/voice';
import type { ReceiptStatusResponse } from '@/features/finance/api/receipt';
import type { DraftTransaction } from '@/features/ai/api/chat';

export type ChatMessage = {
  id: string;
  type: 'voice' | 'receipt';
  status: VoiceProcessingStatus;
  transcript?: string;
  extractedData?: ExtractedTransaction;
  transactionId?: string;
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
    extractedData: status.extracted_data ?? msg.extractedData,
    transactionId: status.transaction_id ?? msg.transactionId,
    errorMessage: status.error_message ?? msg.errorMessage,
  };
}

export function applyReceiptStatus(msg: ChatMessage, status: ReceiptStatusResponse): ChatMessage {
  return {
    ...msg,
    status: status.status,
    extractedData: status.extracted_data ?? msg.extractedData,
    transactionId: status.transaction_id ?? msg.transactionId,
    errorMessage: status.error_message ?? msg.errorMessage,
  };
}

export function createUserTextMessage(content: string): UserTextMessage {
  return { id: generateId(), type: 'user', content, createdAt: new Date() };
}

export function createAITypingMessage(originalText: string): AIMessage {
  return { id: generateId(), type: 'ai', isTyping: true, originalText, createdAt: new Date() };
}

export function resolveAIMessage(msg: AIMessage, content: string): AIMessage {
  return { ...msg, content, isTyping: false, failed: false };
}

export function rejectAIMessage(msg: AIMessage, errorText: string): AIMessage {
  return { ...msg, content: errorText, isTyping: false, failed: true };
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
