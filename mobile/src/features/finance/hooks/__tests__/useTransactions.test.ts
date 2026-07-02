import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

const mockListTransactions = jest.fn();

jest.mock('@/features/finance/repository', () => ({
  useFinanceRepository: () => ({ listTransactions: mockListTransactions }),
}));

let mockInitialized = true;
let mockIsGuest = false;
jest.mock('@/stores/auth', () => ({
  useAuthStore: (selector: (s: { initialized: boolean; isGuest: boolean }) => unknown) =>
    selector({ initialized: mockInitialized, isGuest: mockIsGuest }),
}));

import { useTransactions } from '@/features/finance/hooks/useTransactions';

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

describe('useTransactions auth guard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockInitialized = true;
    mockIsGuest = false;
  });

  it('does not fetch before auth is initialized (cold-start race)', async () => {
    mockInitialized = false;

    const { result } = await renderHook(() => useTransactions(), { wrapper: makeWrapper() });

    expect(result.current.fetchStatus).toBe('idle');
    expect(mockListTransactions).not.toHaveBeenCalled();
  });

  it('fetches transactions once auth is initialized', async () => {
    mockListTransactions.mockResolvedValueOnce({ items: [{ id: 't1' }], total: 1 });

    const { result } = await renderHook(() => useTransactions(), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockListTransactions).toHaveBeenCalledTimes(1);
  });

  it('fetches transactions for guest user (local repo, no network involved)', async () => {
    mockIsGuest = true;
    mockListTransactions.mockResolvedValueOnce({ items: [{ id: 'local-t1' }], total: 1 });

    const { result } = await renderHook(() => useTransactions(), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockListTransactions).toHaveBeenCalledTimes(1);
    expect(result.current.data).toEqual({ items: [{ id: 'local-t1' }], total: 1 });
  });
});
