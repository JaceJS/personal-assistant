import {
  createVoiceMessage,
  createReceiptMessage,
  createUploadingMessage,
  markMessageSent,
  applyVoiceStatus,
  applyReceiptStatus,
  createUserTextMessage,
  createAITypingMessage,
  resolveAIMessage,
  rejectAIMessage,
  createDraftMessages,
  setDraftState,
  extractionToDraftTransactions,
  getActiveReceiptIds,
  staleTrackedIds,
  updateMessageIfChanged,
  mergeMessagesSorted,
} from '../chatMessageUtils';
import type { ChatMessage, DraftMessage, Message } from '../chatMessageUtils';
import type { ExtractedTransaction, VoiceStatusResponse } from '@/features/finance/api/voice';
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
  status: 'draft',
  created_at: '2026-01-01T00:00:00.000Z',
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

  it('sets createdAt to the draft transaction\'s actual creation time, not now', () => {
    const msgs = createDraftMessages([makeDraft({ created_at: '2020-01-01T00:00:00.000Z' })]);
    expect(msgs[0].createdAt).toEqual(new Date('2020-01-01T00:00:00.000Z'));
  });

  it('maps a confirmed draft transaction to the saved state', () => {
    const msgs = createDraftMessages([makeDraft({ status: 'confirmed' })]);
    expect(msgs[0].state).toBe('saved');
  });

  it('maps a cancelled draft transaction to the cancelled state', () => {
    const msgs = createDraftMessages([makeDraft({ status: 'cancelled' })]);
    expect(msgs[0].state).toBe('cancelled');
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

  it('starts with no transcript, extractedData, or errorMessage', () => {
    const msg = createVoiceMessage('voice-id-123');
    expect(msg.transcript).toBeUndefined();
    expect(msg.extractedData).toBeUndefined();
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

describe('createUploadingMessage', () => {
  it('creates a receipt message with the given placeholder id and uploading status', () => {
    const msg = createUploadingMessage({
      id: 'local-1',
      type: 'receipt',
      localUri: 'file:///tmp/r.jpg',
      accountId: 'acc-1',
    });
    expect(msg.id).toBe('local-1');
    expect(msg.type).toBe('receipt');
    expect(msg.status).toBe('uploading');
    expect(msg.localUri).toBe('file:///tmp/r.jpg');
    expect(msg.accountId).toBe('acc-1');
  });

  it('creates a voice message with the given placeholder id and uploading status', () => {
    const msg = createUploadingMessage({
      id: 'local-2',
      type: 'voice',
      localUri: 'file:///tmp/v.m4a',
      accountId: 'acc-1',
    });
    expect(msg.type).toBe('voice');
    expect(msg.status).toBe('uploading');
  });

  it('sets createdAt to a Date', () => {
    const msg = createUploadingMessage({
      id: 'local-3',
      type: 'receipt',
      localUri: 'file:///tmp/r.jpg',
      accountId: 'acc-1',
    });
    expect(msg.createdAt).toBeInstanceOf(Date);
  });
});

describe('markMessageSent', () => {
  it('swaps the placeholder id for the real id and sets status to pending', () => {
    const messages: Message[] = [
      createUploadingMessage({
        id: 'local-1',
        type: 'receipt',
        localUri: 'file:///tmp/r.jpg',
        accountId: 'acc-1',
      }),
    ];
    const next = markMessageSent(messages, 'local-1', 'receipt-real-id');
    expect(next[0].id).toBe('receipt-real-id');
    expect((next[0] as ChatMessage).status).toBe('pending');
    expect((next[0] as ChatMessage).localUri).toBe('file:///tmp/r.jpg');
  });

  it('leaves other messages untouched', () => {
    const other = createReceiptMessage('r-other');
    const messages: Message[] = [
      other,
      createUploadingMessage({
        id: 'local-1',
        type: 'voice',
        localUri: 'file:///tmp/v.m4a',
        accountId: 'acc-1',
      }),
    ];
    const next = markMessageSent(messages, 'local-1', 'voice-real-id');
    expect(next[0]).toBe(other);
  });

  it('is a no-op when the placeholder id is not found', () => {
    const messages: Message[] = [createReceiptMessage('r1')];
    const next = markMessageSent(messages, 'missing', 'real-id');
    expect(next[0].id).toBe('r1');
  });
});

describe('applyVoiceStatus', () => {
  const base = () => createVoiceMessage('voice-id-123');

  it('updates status to transcribing, no transcript yet', () => {
    const status: VoiceStatusResponse = {
      id: 'voice-id-123',
      status: 'transcribing',
      transcript: null,
      extracted_data: [],
      transaction_ids: [],
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
      extracted_data: [],
      transaction_ids: [],
      error_message: null,
    };
    const updated = applyVoiceStatus(base(), status);
    expect(updated.status).toBe('transcribed');
    expect(updated.transcript).toBe('Transportasi 10000');
  });

  it('sets extractedData (array) when completed', () => {
    const extractedData: ExtractedTransaction[] = [
      {
        amount: 10000,
        currency: 'IDR',
        merchant: null,
        category_name: 'Transport',
        note: 'Transportasi 10000',
        confidence: 0.9,
      },
    ];
    const status: VoiceStatusResponse = {
      id: 'voice-id-123',
      status: 'completed',
      transcript: 'Transportasi 10000',
      extracted_data: extractedData,
      transaction_ids: ['tx-789'],
      error_message: null,
    };
    const updated = applyVoiceStatus(base(), status);
    expect(updated.status).toBe('completed');
    expect(updated.extractedData).toEqual(extractedData);
  });

  it('sets errorMessage when failed', () => {
    const status: VoiceStatusResponse = {
      id: 'voice-id-123',
      status: 'failed',
      transcript: null,
      extracted_data: [],
      transaction_ids: [],
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
      extracted_data: [],
      transaction_ids: [],
      error_message: null,
    };
    applyVoiceStatus(original, status);
    expect(original.status).toBe('pending');
  });
});

describe('extractionToDraftTransactions', () => {
  const item = (overrides: Partial<ExtractedTransaction> = {}): ExtractedTransaction => ({
    amount: -15000,
    currency: 'IDR',
    merchant: null,
    category_name: 'Makan',
    note: null,
    confidence: 0.9,
    ...overrides,
  });

  it('zips extracted items with their transaction ids and account id', () => {
    const drafts = extractionToDraftTransactions(
      [item({ merchant: 'Kopi' }), item({ merchant: 'Parkir', amount: -5000 })],
      ['tx-1', 'tx-2'],
      'acc-1'
    );
    expect(drafts).toEqual([
      {
        transaction_id: 'tx-1',
        amount: -15000,
        currency: 'IDR',
        merchant: 'Kopi',
        category_name: 'Makan',
        note: null,
        account_id: 'acc-1',
        status: 'draft',
        created_at: expect.any(String),
      },
      {
        transaction_id: 'tx-2',
        amount: -5000,
        currency: 'IDR',
        merchant: 'Parkir',
        category_name: 'Makan',
        note: null,
        account_id: 'acc-1',
        status: 'draft',
        created_at: expect.any(String),
      },
    ]);
  });

  it('stamps every draft in the same call with the same created_at', () => {
    const drafts = extractionToDraftTransactions(
      [item({ merchant: 'Kopi' }), item({ merchant: 'Parkir' })],
      ['tx-1', 'tx-2'],
      'acc-1'
    );
    expect(drafts[0].created_at).toBe(drafts[1].created_at);
  });

  it('returns empty array when there are no extracted items', () => {
    expect(extractionToDraftTransactions([], [], 'acc-1')).toEqual([]);
  });

  it('ignores extra items beyond the number of transaction ids', () => {
    const drafts = extractionToDraftTransactions([item(), item(), item()], ['tx-1'], 'acc-1');
    expect(drafts).toHaveLength(1);
    expect(drafts[0].transaction_id).toBe('tx-1');
  });

  it('turns 3 extracted items into 3 separate pending draft messages, one per transaction', () => {
    const drafts = extractionToDraftTransactions(
      [
        item({ merchant: 'Kopi', amount: -15000 }),
        item({ merchant: 'Parkiran', amount: -5000 }),
        item({ merchant: 'Pertamina', amount: -20000 }),
      ],
      ['tx-1', 'tx-2', 'tx-3'],
      'acc-1'
    );
    const msgs = createDraftMessages(drafts);

    expect(msgs).toHaveLength(3);
    expect(msgs.every((m) => m.type === 'draft' && m.state === 'pending')).toBe(true);
    expect(msgs.map((m) => m.draft.merchant)).toEqual(['Kopi', 'Parkiran', 'Pertamina']);
    expect(msgs.map((m) => m.id)).toEqual(['tx-1', 'tx-2', 'tx-3']);
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
    const msg = createAITypingMessage('halo');
    expect(msg.type).toBe('ai');
    expect(msg.isTyping).toBe(true);
  });

  it('starts with no content', () => {
    const msg = createAITypingMessage('halo');
    expect(msg.content).toBeUndefined();
  });

  it('assigns a unique id', () => {
    const a = createAITypingMessage('halo');
    const b = createAITypingMessage('halo');
    expect(a.id).not.toBe(b.id);
  });

  it('sets createdAt to a Date', () => {
    const msg = createAITypingMessage('halo');
    expect(msg.createdAt).toBeInstanceOf(Date);
  });

  it('stashes the original text for a later retry', () => {
    const msg = createAITypingMessage('sate 20.000');
    expect(msg.originalText).toBe('sate 20.000');
  });
});

describe('resolveAIMessage', () => {
  it('sets content and stops typing', () => {
    const typing = createAITypingMessage('halo');
    const resolved = resolveAIMessage(typing, 'Hello there');
    expect(resolved.content).toBe('Hello there');
    expect(resolved.isTyping).toBe(false);
  });

  it('preserves id and type', () => {
    const typing = createAITypingMessage('halo');
    const resolved = resolveAIMessage(typing, 'reply');
    expect(resolved.id).toBe(typing.id);
    expect(resolved.type).toBe('ai');
  });

  it('does not mutate the original message', () => {
    const typing = createAITypingMessage('halo');
    resolveAIMessage(typing, 'reply');
    expect(typing.isTyping).toBe(true);
    expect(typing.content).toBeUndefined();
  });

  it('clears a previous failed state', () => {
    const typing = createAITypingMessage('halo');
    const rejected = rejectAIMessage(typing, 'error');
    const resolved = resolveAIMessage(rejected, 'reply');
    expect(resolved.failed).toBe(false);
  });

  it('attaches the server-issued message id when provided, so the message can be deleted later', () => {
    const typing = createAITypingMessage('halo');
    const resolved = resolveAIMessage(typing, 'Hello there', 'server-msg-id-1');
    expect(resolved.remoteId).toBe('server-msg-id-1');
  });

  it('leaves remoteId undefined when not provided', () => {
    const typing = createAITypingMessage('halo');
    const resolved = resolveAIMessage(typing, 'Hello there');
    expect(resolved.remoteId).toBeUndefined();
  });
});

describe('rejectAIMessage', () => {
  it('sets content to error text and stops typing', () => {
    const typing = createAITypingMessage('halo');
    const rejected = rejectAIMessage(typing, 'Something went wrong');
    expect(rejected.content).toBe('Something went wrong');
    expect(rejected.isTyping).toBe(false);
  });

  it('preserves id and type', () => {
    const typing = createAITypingMessage('halo');
    const rejected = rejectAIMessage(typing, 'error');
    expect(rejected.id).toBe(typing.id);
    expect(rejected.type).toBe('ai');
  });

  it('does not mutate the original message', () => {
    const typing = createAITypingMessage('halo');
    rejectAIMessage(typing, 'error');
    expect(typing.isTyping).toBe(true);
  });

  it('marks the message as failed so a retry affordance can render', () => {
    const typing = createAITypingMessage('halo');
    const rejected = rejectAIMessage(typing, 'error');
    expect(rejected.failed).toBe(true);
  });

  it('preserves originalText so the same text can be resent', () => {
    const typing = createAITypingMessage('sate 20.000');
    const rejected = rejectAIMessage(typing, 'error');
    expect(rejected.originalText).toBe('sate 20.000');
  });
});

describe('applyReceiptStatus', () => {
  const base = () => createReceiptMessage('receipt-id-456');

  it('updates status to extracting', () => {
    const status: ReceiptStatusResponse = {
      id: 'receipt-id-456',
      status: 'extracting',
      extracted_data: [],
      transaction_ids: [],
      error_message: null,
    };
    const updated = applyReceiptStatus(base(), status);
    expect(updated.status).toBe('extracting');
  });

  it('sets extractedData (array) when completed, including multiple items', () => {
    const extractedData: ExtractedTransaction[] = [
      {
        amount: -80000,
        currency: 'IDR',
        merchant: null,
        category_name: 'Groceries',
        note: null,
        confidence: 0.9,
      },
      {
        amount: -40000,
        currency: 'IDR',
        merchant: null,
        category_name: 'Kesehatan',
        note: null,
        confidence: 0.85,
      },
    ];
    const status: ReceiptStatusResponse = {
      id: 'receipt-id-456',
      status: 'completed',
      extracted_data: extractedData,
      transaction_ids: ['tx-receipt-001', 'tx-receipt-002'],
      error_message: null,
    };
    const updated = applyReceiptStatus(base(), status);
    expect(updated.status).toBe('completed');
    expect(updated.extractedData).toEqual(extractedData);
  });

  it('sets errorMessage when failed', () => {
    const status: ReceiptStatusResponse = {
      id: 'receipt-id-456',
      status: 'failed',
      extracted_data: [],
      transaction_ids: [],
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
      extracted_data: [],
      transaction_ids: [],
      error_message: null,
    };
    applyReceiptStatus(original, status);
    expect(original.status).toBe('pending');
  });
});

describe('getActiveReceiptIds', () => {
  it('returns ids of receipt messages still pending or extracting', () => {
    const messages: Message[] = [
      createReceiptMessage('r1'),
      { ...createReceiptMessage('r2'), status: 'extracting' },
    ];
    expect(getActiveReceiptIds(messages)).toEqual(['r1', 'r2']);
  });

  it('excludes receipt messages that reached a terminal status', () => {
    const messages: Message[] = [
      { ...createReceiptMessage('r1'), status: 'completed' },
      { ...createReceiptMessage('r2'), status: 'failed' },
      createReceiptMessage('r3'),
    ];
    expect(getActiveReceiptIds(messages)).toEqual(['r3']);
  });

  it('excludes receipt messages still uploading (no server id to poll yet)', () => {
    const messages: Message[] = [
      createUploadingMessage({
        id: 'local-1',
        type: 'receipt',
        localUri: 'file:///tmp/r.jpg',
        accountId: 'acc-1',
      }),
      createReceiptMessage('r1'),
    ];
    expect(getActiveReceiptIds(messages)).toEqual(['r1']);
  });

  it('excludes voice messages even when non-terminal', () => {
    const messages: Message[] = [createVoiceMessage('v1'), createReceiptMessage('r1')];
    expect(getActiveReceiptIds(messages)).toEqual(['r1']);
  });

  it('excludes non-chat message types (user/ai/draft)', () => {
    const messages: Message[] = [
      createUserTextMessage('hi'),
      createAITypingMessage('hi'),
      createReceiptMessage('r1'),
    ];
    expect(getActiveReceiptIds(messages)).toEqual(['r1']);
  });

  it('returns an empty array when there are no messages', () => {
    expect(getActiveReceiptIds([])).toEqual([]);
  });

  it('preserves message order', () => {
    const messages: Message[] = [
      createReceiptMessage('r-later'),
      createReceiptMessage('r-earlier'),
    ];
    expect(getActiveReceiptIds(messages)).toEqual(['r-later', 'r-earlier']);
  });
});

describe('updateMessageIfChanged', () => {
  it('replaces the matching message when the updater changes it', () => {
    const messages: Message[] = [createReceiptMessage('r1'), createReceiptMessage('r2')];
    const next = updateMessageIfChanged(messages, 'r1', (m) => ({ ...m, status: 'extracting' }));
    expect(next).not.toBe(messages);
    expect((next[0] as ChatMessage).status).toBe('extracting');
    expect(next[1]).toBe(messages[1]);
  });

  it('returns the same array reference when nothing actually changes', () => {
    const messages: Message[] = [createReceiptMessage('r1')];
    const next = updateMessageIfChanged(messages, 'r1', (m) => ({ ...m }));
    expect(next).toBe(messages);
  });

  it('returns the same array reference when the id is not found', () => {
    const messages: Message[] = [createReceiptMessage('r1')];
    const next = updateMessageIfChanged(messages, 'missing', (m) => ({ ...m, status: 'failed' }));
    expect(next).toBe(messages);
  });

  it('detects a change via errorMessage even when status is unchanged', () => {
    const messages: Message[] = [{ ...createReceiptMessage('r1'), status: 'failed' }];
    const next = updateMessageIfChanged(messages, 'r1', (m) => ({
      ...m,
      errorMessage: 'Vision model timeout',
    }));
    expect(next).not.toBe(messages);
    expect((next[0] as ChatMessage).errorMessage).toBe('Vision model timeout');
  });

  it('detects a change via extractedData even when status is unchanged', () => {
    const extractedData: ExtractedTransaction[] = [
      {
        amount: -1000,
        currency: 'IDR',
        merchant: null,
        category_name: 'Lain-lain',
        note: null,
        confidence: 0.5,
      },
    ];
    const messages: Message[] = [{ ...createReceiptMessage('r1'), status: 'completed' }];
    const next = updateMessageIfChanged(messages, 'r1', (m) => ({ ...m, extractedData }));
    expect(next).not.toBe(messages);
    expect((next[0] as ChatMessage).extractedData).toEqual(extractedData);
  });

  it('leaves other messages in the array untouched', () => {
    const other = createUserTextMessage('hello');
    const messages: Message[] = [other, createReceiptMessage('r1')];
    const next = updateMessageIfChanged(messages, 'r1', (m) => ({ ...m, status: 'extracting' }));
    expect(next[0]).toBe(other);
  });
});

describe('mergeMessagesSorted', () => {
  const at = (iso: string): Date => new Date(iso);

  it('interleaves an incoming draft between existing text messages by createdAt, not appended at the end', () => {
    const earlierText = { ...createUserTextMessage('halo'), createdAt: at('2026-01-01T10:00:00Z') };
    const laterText = { ...createUserTextMessage('makasih'), createdAt: at('2026-01-01T10:05:00Z') };
    const oldDraft = createDraftMessages([
      makeDraft({ transaction_id: 'tx-old', created_at: '2026-01-01T10:02:00Z' }),
    ])[0];

    const merged = mergeMessagesSorted([earlierText, laterText], [oldDraft]);

    expect(merged.map((m) => m.id)).toEqual([earlierText.id, oldDraft.id, laterText.id]);
  });

  it('keeps chronological order for a full chat history reload (text + drafts mixed)', () => {
    const t1 = { ...createUserTextMessage('a'), createdAt: at('2026-01-01T10:00:00Z') };
    const t2 = { ...createUserTextMessage('b'), createdAt: at('2026-01-01T10:03:00Z') };
    const d1 = createDraftMessages([
      makeDraft({ transaction_id: 'tx-1', created_at: '2026-01-01T10:01:00Z' }),
    ])[0];
    const d2 = createDraftMessages([
      makeDraft({ transaction_id: 'tx-2', created_at: '2026-01-01T10:04:00Z' }),
    ])[0];

    const merged = mergeMessagesSorted([t1, t2], [d1, d2]);

    expect(merged.map((m) => m.id)).toEqual([t1.id, d1.id, t2.id, d2.id]);
  });

  it('appends a brand new draft after all existing messages when it is the newest', () => {
    const t1 = { ...createUserTextMessage('a'), createdAt: at('2026-01-01T10:00:00Z') };
    const freshDraft = createDraftMessages([
      makeDraft({ transaction_id: 'tx-fresh', created_at: '2026-01-01T11:00:00Z' }),
    ])[0];

    const merged = mergeMessagesSorted([t1], [freshDraft]);

    expect(merged.map((m) => m.id)).toEqual([t1.id, freshDraft.id]);
  });

  it('returns an empty array when both inputs are empty', () => {
    expect(mergeMessagesSorted([], [])).toEqual([]);
  });
});

describe('staleTrackedIds', () => {
  it('returns tracked ids no longer present in messages', () => {
    const messages: Message[] = [createReceiptMessage('r1')];
    expect(staleTrackedIds(['r1', 'r2', 'r3'], messages)).toEqual(['r2', 'r3']);
  });

  it('returns an empty array when every tracked id is still present', () => {
    const messages: Message[] = [createReceiptMessage('r1'), createVoiceMessage('v1')];
    expect(staleTrackedIds(['r1', 'v1'], messages)).toEqual([]);
  });

  it('returns an empty array for an empty tracked-id input', () => {
    expect(staleTrackedIds([], [createReceiptMessage('r1')])).toEqual([]);
  });

  it('treats every tracked id as stale when messages is empty', () => {
    expect(staleTrackedIds(['r1', 'v1'], [])).toEqual(['r1', 'v1']);
  });
});
