import {
  createVoiceMessage,
  createReceiptMessage,
  applyVoiceStatus,
  applyReceiptStatus,
} from '../chatMessageUtils';
import type { VoiceStatusResponse } from '@/features/finance/api/voice';
import type { ReceiptStatusResponse } from '@/features/finance/api/receipt';

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
