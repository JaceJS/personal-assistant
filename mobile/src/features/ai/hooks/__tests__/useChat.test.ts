import { renderHook, act } from '@testing-library/react-native';

jest.mock('@/features/ai/api/chat', () => ({
  postChatMessage: jest.fn(),
}));

import { postChatMessage } from '@/features/ai/api/chat';
import { useChat } from '@/features/ai/hooks/useChat';

const mockPostChatMessage = postChatMessage as jest.MockedFunction<typeof postChatMessage>;

describe('useChat', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sends first message without session_id and stores returned session', async () => {
    mockPostChatMessage.mockResolvedValueOnce({ reply: 'Hello!', session_id: 'session-abc' });

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
      .mockResolvedValueOnce({ reply: 'First reply', session_id: 'session-abc' })
      .mockResolvedValueOnce({ reply: 'Second reply', session_id: 'session-abc' });

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

  it('sets pendingDraft when reply contains draft_transaction', async () => {
    mockPostChatMessage.mockResolvedValueOnce({
      reply: 'Draft created',
      session_id: 'session-abc',
      draft_transaction: {
        transaction_id: 'tx-123',
        amount: -50000,
        currency: 'IDR',
        merchant: 'Warteg',
        category_name: null,
        note: null,
        account_id: 'acct-456',
      },
    });

    const { result } = await renderHook(() => useChat());

    await act(async () => {
      await result.current.sendMessage('catat pengeluaran');
    });

    expect(result.current.pendingDraft?.transaction_id).toBe('tx-123');
  });

  it('clears pendingDraft when dismissDraft called', async () => {
    mockPostChatMessage.mockResolvedValueOnce({
      reply: 'Draft created',
      session_id: 'session-abc',
      draft_transaction: {
        transaction_id: 'tx-123',
        amount: -50000,
        currency: 'IDR',
        merchant: null,
        category_name: null,
        note: null,
        account_id: 'acct-456',
      },
    });

    const { result } = await renderHook(() => useChat());

    await act(async () => {
      await result.current.sendMessage('catat');
    });

    await act(async () => {
      result.current.dismissDraft();
    });

    expect(result.current.pendingDraft).toBeNull();
  });
});
