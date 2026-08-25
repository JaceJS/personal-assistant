import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';

jest.mock('@/features/ai/api/chat', () => ({
  confirmAiDraft: jest.fn(),
}));

const mockCreateTransaction = jest.fn();
jest.mock('@/features/finance/repository', () => ({
  useFinanceRepository: () => ({ createTransaction: mockCreateTransaction }),
}));

let mockIsGuest = false;
jest.mock('@/stores/auth', () => ({
  useAuthStore: (selector: (s: { isGuest: boolean }) => unknown) =>
    selector({ isGuest: mockIsGuest }),
}));

import { confirmAiDraft } from '@/features/ai/api/chat';
import { useConfirmAiDraft } from '@/features/ai/hooks/useConfirmAiDraft';

const mockConfirm = confirmAiDraft as jest.MockedFunction<typeof confirmAiDraft>;

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

const payload = {
  amount: -20000,
  accountId: 'acc-1',
  categoryId: 'cat-1',
  merchant: 'Sate',
  note: null,
  occurredAt: new Date('2026-01-05T08:00:00.000Z'),
};

describe('useConfirmAiDraft', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsGuest = false;
  });

  it('for an authenticated user, PATCHes the existing draft transaction', async () => {
    mockConfirm.mockResolvedValueOnce(undefined as never);

    const { result } = await renderHook(() => useConfirmAiDraft(), { wrapper: makeWrapper() });

    await act(async () => {
      await result.current.mutateAsync({ transactionId: 'tx-123', payload });
    });

    expect(mockConfirm).toHaveBeenCalledWith('tx-123', {
      amount: -20000,
      account_id: 'acc-1',
      category_id: 'cat-1',
      merchant: 'Sate',
      note: null,
      occurred_at: '2026-01-05T08:00:00.000Z',
    });
    expect(mockCreateTransaction).not.toHaveBeenCalled();
  });

  it('for a guest, creates a new local confirmed transaction instead of calling the backend', async () => {
    mockIsGuest = true;
    mockCreateTransaction.mockResolvedValueOnce({} as never);

    const { result } = await renderHook(() => useConfirmAiDraft(), { wrapper: makeWrapper() });

    await act(async () => {
      await result.current.mutateAsync({ transactionId: 'tx-123', payload });
    });

    expect(mockConfirm).not.toHaveBeenCalled();
    expect(mockCreateTransaction).toHaveBeenCalledTimes(1);
    const call = mockCreateTransaction.mock.calls[0][0];
    expect(call.account_id).toBe('acc-1');
    expect(call.category_id).toBe('cat-1');
    expect(call.amount).toBe(-20000);
    expect(call.merchant).toBe('Sate');
    expect(call.occurred_at).toBe('2026-01-05T08:00:00.000Z');
    expect(typeof call.id).toBe('string');
    expect(call.id.length).toBeGreaterThan(0);
  });

  it('for a guest with no account selected, rejects without calling the repository', async () => {
    mockIsGuest = true;

    const { result } = await renderHook(() => useConfirmAiDraft(), { wrapper: makeWrapper() });

    await act(async () => {
      await result.current
        .mutateAsync({ transactionId: 'tx-123', payload: { ...payload, accountId: null } })
        .catch(() => undefined);
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(mockCreateTransaction).not.toHaveBeenCalled();
  });

  it('exposes error state when the authenticated confirm request fails', async () => {
    mockConfirm.mockRejectedValueOnce(new Error('boom'));

    const { result } = await renderHook(() => useConfirmAiDraft(), { wrapper: makeWrapper() });

    await act(async () => {
      await result.current.mutateAsync({ transactionId: 'tx-123', payload }).catch(() => undefined);
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
