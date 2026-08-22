import { generateId } from "@/lib/utils";

import type {
  ExtractedTransaction,
  VoiceProcessingStatus,
  VoiceStatusResponse,
} from "@/features/finance/api/voice";
import type { ReceiptStatusResponse } from "@/features/finance/api/receipt";
import type { DraftTransaction } from "@/features/ai/api/chat";

export type ChatMessageStatus = VoiceProcessingStatus | "uploading";

export type ChatMessage = {
  id: string;
  type: "voice" | "receipt";
  status: ChatMessageStatus;
  transcript?: string;
  extractedData?: ExtractedTransaction[];
  errorMessage?: string;
  // Local audio/image URI + account, kept so a failed upload can be retried
  // without re-recording.
  localUri?: string;
  accountId?: string;
  createdAt: Date;
};

export type MessageSendStatus = "sending" | "sent" | "failed";

export type UserTextMessage = {
  id: string;
  type: "user";
  content: string;
  status: MessageSendStatus;
  createdAt: Date;
  // The chat_messages row id on the backend. Undefined until the send this
  // message belongs to resolves — only messages with a remoteId can be
  // deleted server-side (see useChat's dispatch and deleteMessage).
  remoteId?: string;
};

export type AIMessage = {
  id: string;
  type: "ai";
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

export type DraftMessageState = "pending" | "saving" | "saved" | "cancelled";

export type DraftMessage = {
  id: string;
  type: "draft";
  draft: DraftTransaction;
  state: DraftMessageState;
  createdAt: Date;
};

export type Message = ChatMessage | UserTextMessage | AIMessage | DraftMessage;

export function createVoiceMessage(
  voiceLogId: string,
  localUri?: string,
  accountId?: string
): ChatMessage {
  return {
    id: voiceLogId,
    type: "voice",
    status: "pending",
    localUri,
    accountId,
    createdAt: new Date(),
  };
}

export function createReceiptMessage(
  receiptLogId: string,
  localUri?: string,
  accountId?: string
): ChatMessage {
  return {
    id: receiptLogId,
    type: "receipt",
    status: "pending",
    localUri,
    accountId,
    createdAt: new Date(),
  };
}

export function createUploadingMessage({
  id,
  type,
  localUri,
  accountId,
}: {
  id: string;
  type: "voice" | "receipt";
  localUri: string;
  accountId: string;
}): ChatMessage {
  return {
    id,
    type,
    status: "uploading",
    localUri,
    accountId,
    createdAt: new Date(),
  };
}

export function markMessageSent(
  messages: Message[],
  placeholderId: string,
  realId: string
): Message[] {
  return messages.map((m) =>
    m.id === placeholderId && (m.type === "receipt" || m.type === "voice")
      ? { ...m, id: realId, status: "pending" as const }
      : m
  );
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
  return { id: generateId(), type: "user", content, status: "sending", createdAt: new Date() };
}

export function createAITypingMessage(originalText: string): AIMessage {
  return { id: generateId(), type: "ai", isTyping: true, originalText, createdAt: new Date() };
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
  accountId: string
): DraftTransaction[] {
  const now = new Date().toISOString();
  return items.slice(0, transactionIds.length).map((item, i) => ({
    transaction_id: transactionIds[i],
    amount: item.amount,
    currency: item.currency,
    merchant: item.merchant,
    category_name: item.category_name,
    note: item.note,
    account_id: accountId,
    status: "draft" as const,
    created_at: now,
  }));
}

function draftStatusToMessageState(status: DraftTransaction["status"]): DraftMessageState {
  if (status === "confirmed") return "saved";
  if (status === "cancelled") return "cancelled";
  return "pending";
}

export function createDraftMessages(drafts: DraftTransaction[]): DraftMessage[] {
  return drafts.map((draft) => ({
    id: draft.transaction_id,
    type: "draft" as const,
    draft,
    state: draftStatusToMessageState(draft.status),
    createdAt: new Date(draft.created_at),
  }));
}

// Chat history loads text messages and draft transactions as two separate
// arrays; voice/receipt completion appends new drafts to the tail of the
// current list. Neither is safe to just concatenate — every Message variant
// carries createdAt, so re-sorting after merging keeps drafts interleaved at
// their true chronological position instead of piling up wherever they were
// appended.
export function mergeMessagesSorted(prev: Message[], incoming: Message[]): Message[] {
  return [...prev, ...incoming].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
}

export function setDraftState(msg: DraftMessage, state: DraftMessageState): DraftMessage {
  return { ...msg, state };
}

export function applyDraftEdit(msg: DraftMessage, edits: Partial<DraftTransaction>): DraftMessage {
  return { ...msg, draft: { ...msg.draft, ...edits } };
}

export interface DateSeparatorItem {
  id: string;
  type: "dateSeparator";
  date: Date;
}

export type ChatListItem = Message | DateSeparatorItem;

function dateKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

// messages is already sorted ascending (mergeMessagesSorted), so a single
// pass catches every day change.
export function withDateSeparators(messages: Message[]): ChatListItem[] {
  const result: ChatListItem[] = [];
  let lastKey: string | null = null;
  for (const message of messages) {
    const key = dateKey(message.createdAt);
    if (key !== lastKey) {
      result.push({ id: `date-${key}`, type: "dateSeparator", date: message.createdAt });
      lastKey = key;
    }
    result.push(message);
  }
  return result;
}

export const SCROLL_BOTTOM_THRESHOLD = 150;

interface ScrollMetrics {
  contentOffset: { y: number };
  contentSize: { height: number };
  layoutMeasurement: { height: number };
}

export function isScrolledAwayFromBottom(
  event: ScrollMetrics,
  threshold = SCROLL_BOTTOM_THRESHOLD
): boolean {
  const distanceFromBottom =
    event.contentSize.height - event.contentOffset.y - event.layoutMeasurement.height;
  return distanceFromBottom > threshold;
}

// Chat history reload only restores text + draft messages (see useChat) — the
// original voice/receipt bubble (with its local image/audio uri) is never
// persisted server-side, so it's cached client-side and reattached via this.
export function extractMediaMessages(messages: Message[]): ChatMessage[] {
  return messages.filter((m): m is ChatMessage => m.type === "voice" || m.type === "receipt");
}

const NON_POLLABLE_STATUSES: ChatMessageStatus[] = ["uploading", "completed", "failed"];

export function getActiveReceiptIds(messages: Message[]): string[] {
  return messages
    .filter(
      (m): m is ChatMessage => m.type === "receipt" && !NON_POLLABLE_STATUSES.includes(m.status)
    )
    .map((m) => m.id);
}

export function staleTrackedIds(trackedIds: Iterable<string>, messages: Message[]): string[] {
  const currentIds = new Set(messages.map((m) => m.id));
  return Array.from(trackedIds).filter((id) => !currentIds.has(id));
}

// Returns the same array reference when nothing changed, so callers can skip re-rendering.
export function updateMessageIfChanged(
  messages: Message[],
  id: string,
  updater: (msg: ChatMessage) => ChatMessage
): Message[] {
  let changed = false;
  const next = messages.map((m) => {
    if (m.id !== id || (m.type !== "receipt" && m.type !== "voice")) return m;
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
