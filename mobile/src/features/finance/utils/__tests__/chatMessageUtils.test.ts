import {
  createVoiceMessage,
  createReceiptMessage,
  applyVoiceStatus,
  applyReceiptStatus,
  createUserTextMessage,
  createAITypingMessage,
  resolveAIMessage,
  rejectAIMessage,
  createDraftMessages,
  setDraftState,
} from '../chatMessageUtils';
import type { DraftMessage } from '../chatMessageUtils';
import type { VoiceStatusResponse } from '@/features/finance/api/voice';
import type { ReceiptStatusResponse } from '@/features/finance/api/receipt';
import type { DraftTransaction } from '@/features/ai/api/chat';

const makeDraft = (overrides: Partial<DraftTransaction> = {}): DraftTransaction => ({
  transaction_id: 'tx-1',
  amount: -20000,
  currency: 'IDR',
  merchant: 'Sate',
  category_name: 'Makan',
  note: null,
  account_id: 'acc-1',
  ...overrides,
});

describe('createDraftMessages', () => {
  it('creates one pending draft message per draft transaction', () => {
    const msgs = createDraftMessages([
      makeDraft({ transaction_id: 'tx-1', merchant: 'Sate' }),
      makeDraft({ transaction_id: 'tx-2', merchant: 'Es Teh', amount: -5000 }),
    ]);
    expect(msgs).toHaveLength(2);
    expect(msgs[0].type).toBe('draft');
    expect(msgs[0].state).toBe('pending');
    expect(msgs[0].draft.merchant).toBe('Sate');
    expect(msgs[1].draft.merchant).toBe('Es Teh');
  });

  it('uses transaction_id as the message id so drafts stay unique', () => {
    const msgs = createDraftMessages([makeDraft({ transaction_id: 'tx-9' })]);
    expect(msgs[0].id).toBe('tx-9');
  });

  it('returns empty array for empty input', () => {
    expect(createDraftMessages([])).toEqual([]);
  });

  it('sets createdAt to a Date', () => {
    const msgs = createDraftMessages([makeDraft()]);
    expect(msgs[0].createdAt).toBeInstanceOf(Date);
  });
});

describe('setDraftState', () => {
  const base = (): DraftMessage => createDraftMessages([makeDraft()])[0];

  it('transitions pending → saving → saved', () => {
    const saving = setDraftState(base(), 'saving');
    expect(saving.state).toBe('saving');
    const saved = setDraftState(saving, 'saved');
    expect(saved.state).toBe('saved');
  });

  it('transitions to cancelled without touching draft data', () => {
    const msg = base();
    const cancelled = setDraftState(msg, 'cancelled');
    expect(cancelled.state).toBe('cancelled');
    expect(cancelled.draft).toEqual(msg.draft);
    expect(cancelled.id).toBe(msg.id);
  });

  it('does not mutate the original message', () => {
    const msg = base();
    setDraftState(msg, 'saved');
    expect(msg.state).toBe('pending');
  });
});

describe('createVoiceMessage', () => {
  it('creates message with correct id, type, and pending status', () => {
    const msg = createVoiceMessage('voice-id-123');
    expect(msg.id).toBe('voice-id-123');
    expect(msg.type).toBe('voice');
    expect(msg.status).toBe('pending');
  });

  it('starts with no transcript, extractedData, or transactionId', () => {
    const msg = createVoiceMessage('voice-id-123');
    expect(msg.transcript).toBeUndefined();
    expect(msg.extractedData).toBeUndefined();
    expect(msg.transactionId).toBeUndefined();
    expect(msg.errorMessage).toBeUndefined();
  });

  it('sets createdAt to a Date', () => {
    const before = new Date();
    const msg = createVoiceMessage('voice-id-123');
    const after = new Date();
    expect(msg.createdAt).toBeInstanceOf(Date);
    expect(msg.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(msg.createdAt.getTime()).toBeLessThanOrEqual(after.getTime());
  });
});

describe('createReceiptMessage', () => {
  it('creates message with correct id, type, and pending status', () => {
    const msg = createReceiptMessage('receipt-id-456');
    expect(msg.id).toBe('receipt-id-456');
    expect(msg.type).toBe('receipt');
    expect(msg.status).toBe('pending');
  });

  it('sets createdAt to a Date', () => {
    const msg = createReceiptMessage('receipt-id-456');
    expect(msg.createdAt).toBeInstanceOf(Date);
  });
});

describe('applyVoiceStatus', () => {
  const base = () => createVoiceMessage('voice-id-123');

  it('updates status to transcribing, no transcript yet', () => {
    const status: VoiceStatusResponse = {
      id: 'voice-id-123',
      status: 'transcribing',
      transcript: null,
      extracted_data: null,
      transaction_id: null,
      error_message: null,
    };
    const updated = applyVoiceStatus(base(), status);
    expect(updated.status).toBe('transcribing');
    expect(updated.transcript).toBeUndefined();
  });

  it('sets transcript when status is transcribed', () => {
    const status: VoiceStatusResponse = {
      id: 'voice-id-123',
      status: 'transcribed',
      transcript: 'Transportasi 10000',
      extracted_data: null,
      transaction_id: null,
      error_message: null,
    };
    const updated = applyVoiceStatus(base(), status);
    expect(updated.status).toBe('transcribed');
    expect(updated.transcript).toBe('Transportasi 10000');
  });

  it('sets extractedData and transactionId when completed', () => {
    const extractedData = {
      amount: 10000,
      currency: 'IDR',
      merchant: null,
      category_name: 'Transport',
      note: 'Transportasi 10000',
      confidence: 0.9,
    };
    const status: VoiceStatusResponse = {
      id: 'voice-id-123',
      status: 'completed',
      transcript: 'Transportasi 10000',
      extracted_data: extractedData,
      transaction_id: 'tx-789',
      error_message: null,
    };
    const updated = applyVoiceStatus(base(), status);
    expect(updated.status).toBe('completed');
    expect(updated.extractedData).toEqual(extractedData);
    expect(updated.transactionId).toBe('tx-789');
  });

  it('sets errorMessage when failed', () => {
    const status: VoiceStatusResponse = {
      id: 'voice-id-123',
      status: 'failed',
      transcript: null,
      extracted_data: null,
      transaction_id: null,
      error_message: 'STT provider error',
    };
    const updated = applyVoiceStatus(base(), status);
    expect(updated.status).toBe('failed');
    expect(updated.errorMessage).toBe('STT provider error');
  });

  it('does not mutate the original message', () => {
    const original = base();
    const status: VoiceStatusResponse = {
      id: 'voice-id-123',
      status: 'transcribing',
      transcript: null,
      extracted_data: null,
      transaction_id: null,
      error_message: null,
    };
    applyVoiceStatus(original, status);
    expect(original.status).toBe('pending');
  });
});

describe('createUserTextMessage', () => {
  it('creates message with correct type and content', () => {
    const msg = createUserTextMessage('Hello world');
    expect(msg.type).toBe('user');
    expect(msg.content).toBe('Hello world');
  });

  it('assigns a unique id', () => {
    const a = createUserTextMessage('a');
    const b = createUserTextMessage('b');
    expect(a.id).toBeTruthy();
    expect(a.id).not.toBe(b.id);
  });

  it('sets createdAt to a Date', () => {
    const before = new Date();
    const msg = createUserTextMessage('hi');
    const after = new Date();
    expect(msg.createdAt).toBeInstanceOf(Date);
    expect(msg.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(msg.createdAt.getTime()).toBeLessThanOrEqual(after.getTime());
  });
});

describe('createAITypingMessage', () => {
  it('creates message with type ai and isTyping true', () => {
    const msg = createAITypingMessage();
    expect(msg.type).toBe('ai');
    expect(msg.isTyping).toBe(true);
  });

  it('starts with no content', () => {
    const msg = createAITypingMessage();
    expect(msg.content).toBeUndefined();
  });

  it('assigns a unique id', () => {
    const a = createAITypingMessage();
    const b = createAITypingMessage();
    expect(a.id).not.toBe(b.id);
  });

  it('sets createdAt to a Date', () => {
    const msg = createAITypingMessage();
    expect(msg.createdAt).toBeInstanceOf(Date);
  });
});

describe('resolveAIMessage', () => {
  it('sets content and stops typing', () => {
    const typing = createAITypingMessage();
    const resolved = resolveAIMessage(typing, 'Hello there');
    expect(resolved.content).toBe('Hello there');
    expect(resolved.isTyping).toBe(false);
  });

  it('preserves id and type', () => {
    const typing = createAITypingMessage();
    const resolved = resolveAIMessage(typing, 'reply');
    expect(resolved.id).toBe(typing.id);
    expect(resolved.type).toBe('ai');
  });

  it('does not mutate the original message', () => {
    const typing = createAITypingMessage();
    resolveAIMessage(typing, 'reply');
    expect(typing.isTyping).toBe(true);
    expect(typing.content).toBeUndefined();
  });
});

describe('rejectAIMessage', () => {
  it('sets content to error text and stops typing', () => {
    const typing = createAITypingMessage();
    const rejected = rejectAIMessage(typing, 'Something went wrong');
    expect(rejected.content).toBe('Something went wrong');
    expect(rejected.isTyping).toBe(false);
  });

  it('preserves id and type', () => {
    const typing = createAITypingMessage();
    const rejected = rejectAIMessage(typing, 'error');
    expect(rejected.id).toBe(typing.id);
    expect(rejected.type).toBe('ai');
  });

  it('does not mutate the original message', () => {
    const typing = createAITypingMessage();
    rejectAIMessage(typing, 'error');
    expect(typing.isTyping).toBe(true);
  });
});

describe('applyReceiptStatus', () => {
  const base = () => createReceiptMessage('receipt-id-456');

  it('updates status to extracting', () => {
    const status: ReceiptStatusResponse = {
      id: 'receipt-id-456',
      status: 'extracting',
      extracted_data: null,
      transaction_id: null,
      error_message: null,
    };
    const updated = applyReceiptStatus(base(), status);
    expect(updated.status).toBe('extracting');
  });

  it('sets extractedData and transactionId when completed', () => {
    const extractedData = {
      amount: 50000,
      currency: 'IDR',
      merchant: 'Indomaret',
      category_name: 'Food',
      note: 'Struk belanja',
      confidence: 0.95,
    };
    const status: ReceiptStatusResponse = {
      id: 'receipt-id-456',
      status: 'completed',
      extracted_data: extractedData,
      transaction_id: 'tx-receipt-001',
      error_message: null,
    };
    const updated = applyReceiptStatus(base(), status);
    expect(updated.status).toBe('completed');
    expect(updated.extractedData).toEqual(extractedData);
    expect(updated.transactionId).toBe('tx-receipt-001');
  });

  it('sets errorMessage when failed', () => {
    const status: ReceiptStatusResponse = {
      id: 'receipt-id-456',
      status: 'failed',
      extracted_data: null,
      transaction_id: null,
      error_message: 'Vision model timeout',
    };
    const updated = applyReceiptStatus(base(), status);
    expect(updated.status).toBe('failed');
    expect(updated.errorMessage).toBe('Vision model timeout');
  });

  it('does not mutate the original message', () => {
    const original = base();
    const status: ReceiptStatusResponse = {
      id: 'receipt-id-456',
      status: 'extracting',
      extracted_data: null,
      transaction_id: null,
      error_message: null,
    };
    applyReceiptStatus(original, status);
    expect(original.status).toBe('pending');
  });
});
