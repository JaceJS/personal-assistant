import type { ExtractedTransaction, VoiceProcessingStatus, VoiceStatusResponse } from '@/features/finance/api/voice';
import type { ReceiptStatusResponse } from '@/features/finance/api/receipt';

export type ChatMessage = {
  id: string;
  type: 'voice' | 'receipt';
  status: VoiceProcessingStatus;
  transcript?: string;
  extractedData?: ExtractedTransaction;
  transactionId?: string;
  errorMessage?: string;
  createdAt: Date;
};

export function createVoiceMessage(voiceLogId: string): ChatMessage {
  return {
    id: voiceLogId,
    type: 'voice',
    status: 'pending',
    createdAt: new Date(),
  };
}

export function createReceiptMessage(receiptLogId: string): ChatMessage {
  return {
    id: receiptLogId,
    type: 'receipt',
    status: 'pending',
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
