import { renderHook, act } from '@testing-library/react-native';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('@/features/ai/api/chat', () => ({
  postChatMessage: jest.fn(),
  getChatSessionMessages: jest.fn(),
  deleteChatMessage: jest.fn(),
}));

jest.mock('@/features/ai/api/guestChat', () => ({
  postGuestChatMessage: jest.fn(),
  toGuestAccountSnapshots: jest.fn((accounts: unknown[]) => accounts),
}));

jest.mock('@/lib/guestDeviceId', () => ({
  getOrCreateGuestDeviceId: jest.fn(() => Promise.resolve('device-abc')),
}));

jest.mock('@/features/ai/repository/guestChatStorage', () => ({
  loadGuestChatMessages: jest.fn(() => []),
  saveGuestChatMessages: jest.fn(),
  clearGuestChatMessages: jest.fn(),
}));

// useChat imports ApiError from @/lib/api/client, which imports @/lib/supabase
// at module scope — createClient() throws immediately without a real
// Supabase URL, so it must be mocked even though nothing here calls apiFetch
// directly (postGuestChatMessage/postChatMessage are both mocked above).
jest.mock('@/lib/supabase', () => ({
  supabase: { auth: { getSession: jest.fn().mockResolvedValue({ data: { session: null } }) } },
}));

let mockIsGuest = false;
jest.mock('@/stores/auth', () => ({
  useAuthStore: (selector: (s: { isGuest: boolean }) => unknown) =>
    selector({ isGuest: mockIsGuest }),
}));

import AsyncStorage from '@react-native-async-storage/async-storage';

import { deleteChatMessage, getChatSessionMessages, postChatMessage } from '@/features/ai/api/chat';
import { postGuestChatMessage } from '@/features/ai/api/guestChat';
import {
  clearGuestChatMessages,
  loadGuestChatMessages,
  saveGuestChatMessages,
} from '@/features/ai/repository/guestChatStorage';
import { useChat } from '@/features/ai/hooks/useChat';
import { ApiError } from '@/lib/api/client';
import { createUserTextMessage } from '@/features/finance/utils/chatMessageUtils';
import type {
  AIMessage,
  DraftMessage,
  UserTextMessage,
} from '@/features/finance/utils/chatMessageUtils';

const mockPostChatMessage = postChatMessage as jest.MockedFunction<typeof postChatMessage>;
const mockPostGuestChatMessage = postGuestChatMessage as jest.MockedFunction<
  typeof postGuestChatMessage
>;
const mockGetChatSessionMessages = getChatSessionMessages as jest.MockedFunction<
  typeof getChatSessionMessages
>;
const mockDeleteChatMessage = deleteChatMessage as jest.MockedFunction<typeof deleteChatMessage>;
const mockLoadGuestChatMessages = loadGuestChatMessages as jest.MockedFunction<
  typeof loadGuestChatMessages
>;
const mockSaveGuestChatMessages = saveGuestChatMessages as jest.MockedFunction<
  typeof saveGuestChatMessages
>;
const mockClearGuestChatMessages = clearGuestChatMessages as jest.MockedFunction<
  typeof clearGuestChatMessages
>;
const CHAT_SESSION_KEY = 'chat_session_id';

describe('useChat', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    mockIsGuest = false;
    await AsyncStorage.clear();
  });

  it('sends first message without session_id and stores returned session', async () => {
    mockPostChatMessage.mockResolvedValueOnce({
      reply: 'Hello!',
      session_id: 'session-abc',
      user_message_id: 'msg-user-1',
      assistant_message_id: 'msg-ai-1',
      draft_transactions: [],
    });

    const { result } = await renderHook(() => useChat());

    await act(async () => {
      await result.current.sendMessage('Hi');
    });

    expect(mockPostChatMessage).toHaveBeenCalledWith('Hi', undefined);
    const aiMsg = result.current.messages.find((m) => m.type === 'ai');
    expect(aiMsg).toBeDefined();
    expect((aiMsg as { content?: string }).content).toBe('Hello!');
    expect((aiMsg as { skipTypewriter?: boolean }).skipTypewriter).not.toBe(true);
  });

  it('sends subsequent messages with session_id from previous response', async () => {
    mockPostChatMessage
      .mockResolvedValueOnce({
        reply: 'First reply',
        session_id: 'session-abc',
        user_message_id: 'msg-user-1',
        assistant_message_id: 'msg-ai-1',
        draft_transactions: [],
      })
      .mockResolvedValueOnce({
        reply: 'Second reply',
        session_id: 'session-abc',
        user_message_id: 'msg-user-2',
        assistant_message_id: 'msg-ai-2',
        draft_transactions: [],
      });

    const { result } = await renderHook(() => useChat());

    await act(async () => {
      await result.current.sendMessage('First');
    });

    await act(async () => {
      await result.current.sendMessage('Second');
    });

    expect(mockPostChatMessage).toHaveBeenNthCalledWith(2, 'Second', 'session-abc');
  });

  it('shows error message in AI bubble when request fails', async () => {
    mockPostChatMessage.mockRejectedValueOnce(new Error('Network error'));

    const { result } = await renderHook(() => useChat());

    await act(async () => {
      await result.current.sendMessage('Hi');
    });

    const aiMsg = result.current.messages.find((m) => m.type === 'ai');
    expect((aiMsg as { content?: string }).content).toBe(
      'Could not get a response. Please try again.',
    );
    expect((aiMsg as { failed?: boolean }).failed).toBe(true);
    expect((aiMsg as { originalText?: string }).originalText).toBe('Hi');
  });

  it('retryMessage resends the original text and resolves on success', async () => {
    mockPostChatMessage
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({
        reply: 'Hello (retried)!',
        session_id: 'session-abc',
        user_message_id: 'msg-user-retry',
        assistant_message_id: 'msg-ai-retry',
        draft_transactions: [],
      });

    const { result } = await renderHook(() => useChat());

    await act(async () => {
      await result.current.sendMessage('Hi');
    });
    const failedMsg = result.current.messages.find(
      (m): m is AIMessage => m.type === 'ai',
    )!;

    await act(async () => {
      await result.current.retryMessage(failedMsg);
    });

    expect(mockPostChatMessage).toHaveBeenNthCalledWith(2, 'Hi', undefined);
    const aiMessages = result.current.messages.filter((m) => m.type === 'ai');
    expect(aiMessages).toHaveLength(1);
    expect((aiMessages[0] as { content?: string }).content).toBe('Hello (retried)!');
    expect((aiMessages[0] as { failed?: boolean }).failed).toBe(false);
  });

  it('retryMessage marks the message failed again if the retry also fails', async () => {
    mockPostChatMessage
      .mockRejectedValueOnce(new Error('Network error'))
      .mockRejectedValueOnce(new Error('Still down'));

    const { result } = await renderHook(() => useChat());

    await act(async () => {
      await result.current.sendMessage('Hi');
    });
    const failedMsg = result.current.messages.find(
      (m): m is AIMessage => m.type === 'ai',
    )!;

    await act(async () => {
      await result.current.retryMessage(failedMsg);
    });

    const aiMessages = result.current.messages.filter((m) => m.type === 'ai');
    expect(aiMessages).toHaveLength(1);
    expect((aiMessages[0] as { failed?: boolean }).failed).toBe(true);
  });

  it('appends one draft message per draft transaction after the AI reply', async () => {
    mockPostChatMessage.mockResolvedValueOnce({
      reply: 'Draft dibuat, cek card di bawah.',
      session_id: 'session-abc',
      user_message_id: 'msg-user-drafts',
      assistant_message_id: 'msg-ai-drafts',
      draft_transactions: [
        {
          transaction_id: 'tx-123',
          amount: -20000,
          currency: 'IDR',
          merchant: 'Sate',
          category_name: 'Makan',
          note: null,
          account_id: 'acct-456',
          status: 'draft',
          created_at: new Date(Date.now() + 60_000).toISOString(),
      occurred_at: new Date(Date.now() + 60_000).toISOString(),
        },
        {
          transaction_id: 'tx-124',
          amount: -5000,
          currency: 'IDR',
          merchant: 'Es Teh',
          category_name: 'Makan',
          note: null,
          account_id: 'acct-456',
          status: 'draft',
          created_at: new Date(Date.now() + 60_000).toISOString(),
      occurred_at: new Date(Date.now() + 60_000).toISOString(),
        },
      ],
    });

    const { result } = await renderHook(() => useChat());

    await act(async () => {
      await result.current.sendMessage('sate 20.000 es teh 5.000');
    });

    const drafts = result.current.messages.filter(
      (m): m is DraftMessage => m.type === 'draft',
    );
    expect(drafts).toHaveLength(2);
    expect(drafts.map((d) => d.id)).toEqual(['tx-123', 'tx-124']);
    expect(drafts[0].state).toBe('pending');
    // Draft cards come after the AI reply bubble
    const types = result.current.messages.map((m) => m.type);
    expect(types.indexOf('draft')).toBeGreaterThan(types.indexOf('ai'));
  });

  it('does not add an AI text bubble when the reply is empty (draft card is the confirmation)', async () => {
    mockPostChatMessage.mockResolvedValueOnce({
      reply: '',
      session_id: 'session-abc',
      user_message_id: 'msg-user-empty-reply',
      assistant_message_id: 'msg-ai-empty-reply',
      draft_transactions: [
        {
          transaction_id: 'tx-123',
          amount: -20000,
          currency: 'IDR',
          merchant: 'Sate',
          category_name: 'Makan',
          note: null,
          account_id: 'acct-456',
          status: 'draft',
          created_at: new Date(Date.now() + 60_000).toISOString(),
      occurred_at: new Date(Date.now() + 60_000).toISOString(),
        },
      ],
    });

    const { result } = await renderHook(() => useChat());

    await act(async () => {
      await result.current.sendMessage('sate 20.000');
    });

    expect(result.current.messages.some((m) => m.type === 'ai')).toBe(false);
    expect(result.current.messages.some((m) => m.type === 'draft')).toBe(true);
  });

  it('appends no draft messages when reply has none', async () => {
    mockPostChatMessage.mockResolvedValueOnce({
      reply: 'Halo!',
      session_id: 'session-abc',
      user_message_id: 'msg-user-halo',
      assistant_message_id: 'msg-ai-halo',
      draft_transactions: [],
    });

    const { result } = await renderHook(() => useChat());

    await act(async () => {
      await result.current.sendMessage('halo');
    });

    expect(result.current.messages.some((m) => m.type === 'draft')).toBe(false);
  });

  it('clears in-memory messages and session when the signed-in user session ends', async () => {
    mockPostChatMessage.mockResolvedValueOnce({
      reply: 'Saldo kamu Rp 500.000',
      session_id: 'session-abc',
      user_message_id: 'msg-user-saldo',
      assistant_message_id: 'msg-ai-saldo',
      draft_transactions: [],
    });

    const { result, rerender } = await renderHook(() => useChat());

    await act(async () => {
      await result.current.sendMessage('saldo aku berapa?');
    });
    expect(result.current.messages.length).toBeGreaterThan(0);

    mockIsGuest = true;
    await act(async () => {
      rerender(undefined);
    });

    expect(result.current.messages).toEqual([]);
  });

  it('does not fetch chat history when in guest mode', async () => {
    await AsyncStorage.setItem(CHAT_SESSION_KEY, 'session-from-a-previous-account');
    mockIsGuest = true;

    const { result } = await renderHook(() => useChat());

    expect(mockGetChatSessionMessages).not.toHaveBeenCalled();
    expect(result.current.isLoadingHistory).toBe(false);
  });

  it('restores a guest chat previously saved to local storage', async () => {
    mockIsGuest = true;
    const saved = createUserTextMessage('halo dari sebelumnya');
    mockLoadGuestChatMessages.mockReturnValueOnce([saved]);

    const { result } = await renderHook(() => useChat());

    expect(result.current.messages).toEqual([saved]);
  });

  it('persists guest messages to local storage whenever they change', async () => {
    mockIsGuest = true;
    mockPostGuestChatMessage.mockResolvedValueOnce({
      reply: 'Halo!',
      draft_transactions: [],
      remaining_quota: 2,
    });

    const { result } = await renderHook(() => useChat());

    await act(async () => {
      await result.current.sendMessage('halo');
    });

    expect(mockSaveGuestChatMessages).toHaveBeenLastCalledWith(result.current.messages);
  });

  it('does not persist to local storage for an authenticated user', async () => {
    mockPostChatMessage.mockResolvedValueOnce({
      reply: 'Halo!',
      session_id: 'session-abc',
      user_message_id: 'msg-user-1',
      assistant_message_id: 'msg-ai-1',
      draft_transactions: [],
    });

    const { result } = await renderHook(() => useChat());

    await act(async () => {
      await result.current.sendMessage('halo');
    });

    expect(mockSaveGuestChatMessages).not.toHaveBeenCalled();
  });

  it('clears the local guest chat cache once authenticated', async () => {
    mockIsGuest = false;

    await renderHook(() => useChat());

    expect(mockClearGuestChatMessages).toHaveBeenCalled();
  });

  it('leaves a leftover session id from a previous account untouched when entering guest mode', async () => {
    // Guest mode never reads/writes this key, and the backend scopes it by
    // owner — clearing it here used to also wipe a still-valid session for
    // the same user cycling through a brief guest window on sign-out/sign-in.
    await AsyncStorage.setItem(CHAT_SESSION_KEY, 'session-from-a-previous-account');
    mockIsGuest = true;

    await renderHook(() => useChat());

    expect(await AsyncStorage.getItem(CHAT_SESSION_KEY)).toBe('session-from-a-previous-account');
  });

  it('for a guest, sends the message via the guest endpoint with device id and account snapshot', async () => {
    mockIsGuest = true;
    mockPostGuestChatMessage.mockResolvedValueOnce({
      reply: 'Halo!',
      draft_transactions: [],
      remaining_quota: 2,
    });

    const accounts = [{ id: 'acc-1', name: 'Dompet', type: 'cash', currency: 'IDR', balance: 0 }];
    const { result } = await renderHook(() => useChat(accounts as never));

    await act(async () => {
      await result.current.sendMessage('halo');
    });

    expect(mockPostGuestChatMessage).toHaveBeenCalledWith(
      'halo',
      'device-abc',
      accounts,
      expect.any(Array)
    );
    expect(mockPostChatMessage).not.toHaveBeenCalled();
  });

  it('for a guest, exposes remaining_quota from the reply', async () => {
    mockIsGuest = true;
    mockPostGuestChatMessage.mockResolvedValueOnce({
      reply: 'Halo!',
      draft_transactions: [],
      remaining_quota: 1,
    });

    const { result } = await renderHook(() => useChat());

    await act(async () => {
      await result.current.sendMessage('halo');
    });

    expect(result.current.guestQuota).toBe(1);
  });

  it('for a guest, adds draft messages chronologically merged from the guest reply', async () => {
    mockIsGuest = true;
    mockPostGuestChatMessage.mockResolvedValueOnce({
      reply: '',
      draft_transactions: [
        {
          transaction_id: 'tx-1',
          amount: -20000,
          currency: 'IDR',
          merchant: 'Sate',
          category_name: 'Makan',
          note: null,
          account_id: 'acc-1',
          status: 'draft',
          created_at: new Date().toISOString(),
      occurred_at: new Date().toISOString(),
        },
      ],
      remaining_quota: 2,
    });

    const { result } = await renderHook(() => useChat());

    await act(async () => {
      await result.current.sendMessage('sate 20.000');
    });

    const draft = result.current.messages.find((m): m is DraftMessage => m.type === 'draft');
    expect(draft?.draft.merchant).toBe('Sate');
  });

  it('for a guest, sets quota to 0 and fails the AI bubble when the trial is exhausted (429)', async () => {
    mockIsGuest = true;
    mockPostGuestChatMessage.mockRejectedValueOnce(new ApiError(429, 'quota exceeded'));

    const { result } = await renderHook(() => useChat());

    await act(async () => {
      await result.current.sendMessage('halo');
    });

    expect(result.current.guestQuota).toBe(0);
    const aiMessages = result.current.messages.filter((m) => m.type === 'ai');
    expect((aiMessages[0] as { failed?: boolean }).failed).toBe(true);
  });

  it('rehydrates pending draft cards left over from a previous session', async () => {
    await AsyncStorage.setItem(CHAT_SESSION_KEY, 'session-abc');
    mockGetChatSessionMessages.mockResolvedValueOnce({
      session_id: 'session-abc',
      messages: [
        { id: 'msg-1', role: 'user', content: 'sate 20.000', created_at: '2026-07-08T10:00:00Z' },
        {
          id: 'msg-2',
          role: 'assistant',
          content: 'Draft dibuat, cek card di bawah.',
          created_at: '2026-07-08T10:00:01Z',
        },
      ],
      draft_transactions: [
        {
          transaction_id: 'tx-123',
          amount: -20000,
          currency: 'IDR',
          merchant: 'Sate',
          category_name: 'Makan',
          note: null,
          account_id: 'acct-456',
          status: 'draft',
          created_at: new Date(Date.now() + 60_000).toISOString(),
      occurred_at: new Date(Date.now() + 60_000).toISOString(),
        },
      ],
    });

    const { result } = await renderHook(() => useChat());

    await act(async () => {});

    const drafts = result.current.messages.filter(
      (m): m is DraftMessage => m.type === 'draft',
    );
    expect(drafts).toHaveLength(1);
    expect(drafts[0].id).toBe('tx-123');
    expect(drafts[0].state).toBe('pending');

    const aiMsg = result.current.messages.find((m) => m.type === 'ai');
    expect((aiMsg as { skipTypewriter?: boolean }).skipTypewriter).toBe(true);
  });

  it('skips rehydrating an empty-content assistant turn as an AI bubble', async () => {
    await AsyncStorage.setItem(CHAT_SESSION_KEY, 'session-abc');
    mockGetChatSessionMessages.mockResolvedValueOnce({
      session_id: 'session-abc',
      messages: [
        { id: 'msg-1', role: 'user', content: 'sate 20.000', created_at: '2026-07-08T10:00:00Z' },
        { id: 'msg-2', role: 'assistant', content: '', created_at: '2026-07-08T10:00:01Z' },
      ],
      draft_transactions: [
        {
          transaction_id: 'tx-123',
          amount: -20000,
          currency: 'IDR',
          merchant: 'Sate',
          category_name: 'Makan',
          note: null,
          account_id: 'acct-456',
          status: 'draft',
          created_at: new Date(Date.now() + 60_000).toISOString(),
      occurred_at: new Date(Date.now() + 60_000).toISOString(),
        },
      ],
    });

    const { result } = await renderHook(() => useChat());

    await act(async () => {});

    expect(result.current.messages.some((m) => m.type === 'ai')).toBe(false);
    expect(result.current.messages.some((m) => m.type === 'user')).toBe(true);
  });

  it('rehydrates no draft cards when history has none pending', async () => {
    await AsyncStorage.setItem(CHAT_SESSION_KEY, 'session-abc');
    mockGetChatSessionMessages.mockResolvedValueOnce({
      session_id: 'session-abc',
      messages: [],
      draft_transactions: [],
    });

    const { result } = await renderHook(() => useChat());

    await act(async () => {});

    expect(result.current.messages.some((m) => m.type === 'draft')).toBe(false);
  });

  it('marks the user bubble as sent once the send resolves', async () => {
    mockPostChatMessage.mockResolvedValueOnce({
      reply: 'Hello!',
      session_id: 'session-abc',
      user_message_id: 'msg-user-1',
      assistant_message_id: 'msg-ai-1',
      draft_transactions: [],
    });

    const { result } = await renderHook(() => useChat());

    await act(async () => {
      await result.current.sendMessage('Hi');
    });

    const userMsg = result.current.messages.find(
      (m): m is UserTextMessage => m.type === 'user',
    )!;
    expect(userMsg.status).toBe('sent');
  });

  it('marks the user bubble as failed when the send fails', async () => {
    mockPostChatMessage.mockRejectedValueOnce(new Error('Network error'));

    const { result } = await renderHook(() => useChat());

    await act(async () => {
      await result.current.sendMessage('Hi');
    });

    const userMsg = result.current.messages.find(
      (m): m is UserTextMessage => m.type === 'user',
    )!;
    expect(userMsg.status).toBe('failed');
  });

  it('resets the user bubble to sent after a failed send is retried successfully', async () => {
    mockPostChatMessage
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({
        reply: 'Hello (retried)!',
        session_id: 'session-abc',
        user_message_id: 'msg-user-retry',
        assistant_message_id: 'msg-ai-retry',
        draft_transactions: [],
      });

    const { result } = await renderHook(() => useChat());

    await act(async () => {
      await result.current.sendMessage('Hi');
    });
    const failedMsg = result.current.messages.find(
      (m): m is AIMessage => m.type === 'ai',
    )!;

    await act(async () => {
      await result.current.retryMessage(failedMsg);
    });

    const userMsg = result.current.messages.find(
      (m): m is UserTextMessage => m.type === 'user',
    )!;
    expect(userMsg.status).toBe('sent');
  });

  it('rehydrates history user messages as already sent', async () => {
    await AsyncStorage.setItem(CHAT_SESSION_KEY, 'session-abc');
    mockGetChatSessionMessages.mockResolvedValueOnce({
      session_id: 'session-abc',
      messages: [
        { id: 'msg-1', role: 'user', content: 'sate 20.000', created_at: '2026-07-08T10:00:00Z' },
      ],
      draft_transactions: [],
    });

    const { result } = await renderHook(() => useChat());

    await act(async () => {});

    const userMsg = result.current.messages.find(
      (m): m is UserTextMessage => m.type === 'user',
    )!;
    expect(userMsg.status).toBe('sent');
  });

  it('tags the user and AI bubbles with the server-issued message ids once the send resolves', async () => {
    mockPostChatMessage.mockResolvedValueOnce({
      reply: 'Hello!',
      session_id: 'session-abc',
      user_message_id: 'msg-user-1',
      assistant_message_id: 'msg-ai-1',
      draft_transactions: [],
    });

    const { result } = await renderHook(() => useChat());

    await act(async () => {
      await result.current.sendMessage('Hi');
    });

    const userMsg = result.current.messages.find(
      (m): m is UserTextMessage => m.type === 'user',
    )!;
    const aiMsg = result.current.messages.find((m): m is AIMessage => m.type === 'ai')!;
    expect(userMsg.remoteId).toBe('msg-user-1');
    expect(aiMsg.remoteId).toBe('msg-ai-1');
  });

  it('tags the user bubble with its remoteId even when the reply is empty (draft-only turn)', async () => {
    mockPostChatMessage.mockResolvedValueOnce({
      reply: '',
      session_id: 'session-abc',
      user_message_id: 'msg-user-empty',
      assistant_message_id: 'msg-ai-empty',
      draft_transactions: [
        {
          transaction_id: 'tx-123',
          amount: -20000,
          currency: 'IDR',
          merchant: 'Sate',
          category_name: 'Makan',
          note: null,
          account_id: 'acct-456',
          status: 'draft',
          created_at: new Date(Date.now() + 60_000).toISOString(),
      occurred_at: new Date(Date.now() + 60_000).toISOString(),
        },
      ],
    });

    const { result } = await renderHook(() => useChat());

    await act(async () => {
      await result.current.sendMessage('sate 20.000');
    });

    const userMsg = result.current.messages.find(
      (m): m is UserTextMessage => m.type === 'user',
    )!;
    expect(userMsg.remoteId).toBe('msg-user-empty');
  });

  it('leaves remoteId unset on both bubbles when the send fails', async () => {
    mockPostChatMessage.mockRejectedValueOnce(new Error('Network error'));

    const { result } = await renderHook(() => useChat());

    await act(async () => {
      await result.current.sendMessage('Hi');
    });

    const userMsg = result.current.messages.find(
      (m): m is UserTextMessage => m.type === 'user',
    )!;
    expect(userMsg.remoteId).toBeUndefined();
  });

  it('carries the real backend id as remoteId for messages rehydrated from history', async () => {
    await AsyncStorage.setItem(CHAT_SESSION_KEY, 'session-abc');
    mockGetChatSessionMessages.mockResolvedValueOnce({
      session_id: 'session-abc',
      messages: [
        { id: 'msg-1', role: 'user', content: 'sate 20.000', created_at: '2026-07-08T10:00:00Z' },
        {
          id: 'msg-2',
          role: 'assistant',
          content: 'Draft dibuat, cek card di bawah.',
          created_at: '2026-07-08T10:00:01Z',
        },
      ],
      draft_transactions: [],
    });

    const { result } = await renderHook(() => useChat());

    await act(async () => {});

    const userMsg = result.current.messages.find(
      (m): m is UserTextMessage => m.type === 'user',
    )!;
    const aiMsg = result.current.messages.find((m): m is AIMessage => m.type === 'ai')!;
    expect(userMsg.remoteId).toBe('msg-1');
    expect(aiMsg.remoteId).toBe('msg-2');
  });

  describe('deleteMessage', () => {
    it('calls the delete API and removes the message on success when it has a remoteId', async () => {
      mockPostChatMessage.mockResolvedValueOnce({
        reply: 'Hello!',
        session_id: 'session-abc',
        user_message_id: 'msg-user-1',
        assistant_message_id: 'msg-ai-1',
        draft_transactions: [],
      });
      mockDeleteChatMessage.mockResolvedValueOnce(undefined);

      const { result } = await renderHook(() => useChat());
      await act(async () => {
        await result.current.sendMessage('Hi');
      });
      const aiMsg = result.current.messages.find((m): m is AIMessage => m.type === 'ai')!;

      await act(async () => {
        await result.current.deleteMessage(aiMsg);
      });

      expect(mockDeleteChatMessage).toHaveBeenCalledWith('session-abc', 'msg-ai-1');
      expect(result.current.messages.some((m) => m.id === aiMsg.id)).toBe(false);
    });

    it('removes a message with no remoteId purely from local state, without calling the API', async () => {
      const { result } = await renderHook(() => useChat());
      // A voice/receipt upload card is never persisted to chat_messages, so it
      // never carries a remoteId — only its local id.
      await act(async () => {
        result.current.setMessages((prev) => [
          ...prev,
          {
            id: 'voice-log-1',
            type: 'voice',
            status: 'pending',
            createdAt: new Date(),
          },
        ]);
      });
      const localMsg = result.current.messages[0];

      await act(async () => {
        await result.current.deleteMessage(localMsg);
      });

      expect(mockDeleteChatMessage).not.toHaveBeenCalled();
      expect(result.current.messages).toHaveLength(0);
    });

    it('keeps the message in place and rethrows when the delete API call fails', async () => {
      mockPostChatMessage.mockResolvedValueOnce({
        reply: 'Hello!',
        session_id: 'session-abc',
        user_message_id: 'msg-user-1',
        assistant_message_id: 'msg-ai-1',
        draft_transactions: [],
      });
      mockDeleteChatMessage.mockRejectedValueOnce(new Error('Network error'));

      const { result } = await renderHook(() => useChat());
      await act(async () => {
        await result.current.sendMessage('Hi');
      });
      const aiMsg = result.current.messages.find((m): m is AIMessage => m.type === 'ai')!;

      await expect(
        act(async () => {
          await result.current.deleteMessage(aiMsg);
        }),
      ).rejects.toThrow('Network error');

      expect(result.current.messages.some((m) => m.id === aiMsg.id)).toBe(true);
    });
  });
});
