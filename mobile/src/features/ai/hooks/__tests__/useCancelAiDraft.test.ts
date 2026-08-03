import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';

jest.mock('@/features/finance/api/transactions', () => ({
  updateTransaction: jest.fn(),
  deleteTransaction: jest.fn(),
}));

import { deleteTransaction, updateTransaction } from '@/features/finance/api/transactions';
import { useCancelAiDraft } from '@/features/ai/hooks/useCancelAiDraft';

const mockUpdate = updateTransaction as jest.MockedFunction<typeof updateTransaction>;
const mockDelete = deleteTransaction as jest.MockedFunction<typeof deleteTransaction>;

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

describe('useCancelAiDraft', () => {
  beforeEach(() => jest.clearAllMocks());

  it('marks the draft transaction as cancelled instead of deleting it', async () => {
    mockUpdate.mockResolvedValueOnce({} as never);

    const { result } = await renderHook(() => useCancelAiDraft(), { wrapper: makeWrapper() });

    await act(async () => {
      await result.current.mutateAsync('tx-123');
    });

    expect(mockUpdate).toHaveBeenCalledWith('tx-123', { status: 'cancelled' });
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it('exposes error state when the cancel request fails', async () => {
    mockUpdate.mockRejectedValueOnce(new Error('boom'));

    const { result } = await renderHook(() => useCancelAiDraft(), { wrapper: makeWrapper() });

    await act(async () => {
      await result.current.mutateAsync('tx-123').catch(() => undefined);
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
