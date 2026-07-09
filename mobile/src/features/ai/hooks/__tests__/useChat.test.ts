import { renderHook, act } from '@testing-library/react-native';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('@/features/ai/api/chat', () => ({
  postChatMessage: jest.fn(),
  getChatSessionMessages: jest.fn(),
}));

let mockIsGuest = false;
jest.mock('@/stores/auth', () => ({
  useAuthStore: (selector: (s: { isGuest: boolean }) => unknown) =>
    selector({ isGuest: mockIsGuest }),
}));

import AsyncStorage from '@react-native-async-storage/async-storage';

import { getChatSessionMessages, postChatMessage } from '@/features/ai/api/chat';
import { useChat } from '@/features/ai/hooks/useChat';
import type { DraftMessage } from '@/features/finance/utils/chatMessageUtils';

const mockPostChatMessage = postChatMessage as jest.MockedFunction<typeof postChatMessage>;
const mockGetChatSessionMessages = getChatSessionMessages as jest.MockedFunction<
  typeof getChatSessionMessages
>;
const CHAT_SESSION_KEY = 'chat_session_id';

describe('useChat', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsGuest = false;
  });

  it('sends first message without session_id and stores returned session', async () => {
    mockPostChatMessage.mockResolvedValueOnce({
      reply: 'Hello!',
      session_id: 'session-abc',
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
  });

  it('sends subsequent messages with session_id from previous response', async () => {
    mockPostChatMessage
      .mockResolvedValueOnce({
        reply: 'First reply',
        session_id: 'session-abc',
        draft_transactions: [],
      })
      .mockResolvedValueOnce({
        reply: 'Second reply',
        session_id: 'session-abc',
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
  });

  it('appends one draft message per draft transaction after the AI reply', async () => {
    mockPostChatMessage.mockResolvedValueOnce({
      reply: 'Draft dibuat, cek card di bawah.',
      session_id: 'session-abc',
      draft_transactions: [
        {
          transaction_id: 'tx-123',
          amount: -20000,
          currency: 'IDR',
          merchant: 'Sate',
          category_name: 'Makan',
          note: null,
          account_id: 'acct-456',
        },
        {
          transaction_id: 'tx-124',
          amount: -5000,
          currency: 'IDR',
          merchant: 'Es Teh',
          category_name: 'Makan',
          note: null,
          account_id: 'acct-456',
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

  it('appends no draft messages when reply has none', async () => {
    mockPostChatMessage.mockResolvedValueOnce({
      reply: 'Halo!',
      session_id: 'session-abc',
      draft_transactions: [],
    });

    const { result } = await renderHook(() => useChat());

    await act(async () => {
      await result.current.sendMessage('halo');
    });

    expect(result.current.messages.some((m) => m.type === 'draft')).toBe(false);
  });

  it('does not fetch chat history when in guest mode', async () => {
    await AsyncStorage.setItem(CHAT_SESSION_KEY, 'session-from-a-previous-account');
    mockIsGuest = true;

    const { result } = await renderHook(() => useChat());

    expect(mockGetChatSessionMessages).not.toHaveBeenCalled();
    expect(result.current.isLoadingHistory).toBe(false);
  });

  it('clears a stale session id left over from a previous account when entering guest mode', async () => {
    await AsyncStorage.setItem(CHAT_SESSION_KEY, 'session-from-a-previous-account');
    mockIsGuest = true;

    await renderHook(() => useChat());

    expect(await AsyncStorage.getItem(CHAT_SESSION_KEY)).toBeNull();
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
});
