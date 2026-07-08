import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

const mockListTransactions = jest.fn();
const mockCreateTransaction = jest.fn();
const mockUpdateTransaction = jest.fn();
const mockDeleteTransaction = jest.fn();

jest.mock('@/features/finance/repository', () => ({
  useFinanceRepository: () => ({
    listTransactions: mockListTransactions,
    createTransaction: mockCreateTransaction,
    updateTransaction: mockUpdateTransaction,
    deleteTransaction: mockDeleteTransaction,
  }),
}));

jest.mock('expo-crypto', () => ({ randomUUID: () => 'generated-id' }));

let mockInitialized = true;
let mockIsGuest = false;
jest.mock('@/stores/auth', () => ({
  useAuthStore: (selector: (s: { initialized: boolean; isGuest: boolean }) => unknown) =>
    selector({ initialized: mockInitialized, isGuest: mockIsGuest }),
}));

import {
  useTransactions,
  useCreateTransaction,
  useUpdateTransaction,
  useDeleteTransaction,
} from '@/features/finance/hooks/useTransactions';

function makeWrapper(queryClient: QueryClient) {
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

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { result } = await renderHook(() => useTransactions(), {
      wrapper: makeWrapper(queryClient),
    });

    expect(result.current.fetchStatus).toBe('idle');
    expect(mockListTransactions).not.toHaveBeenCalled();
  });

  it('fetches transactions once auth is initialized', async () => {
    mockListTransactions.mockResolvedValueOnce({ items: [{ id: 't1' }], total: 1 });

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { result } = await renderHook(() => useTransactions(), {
      wrapper: makeWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockListTransactions).toHaveBeenCalledTimes(1);
  });

  it('fetches transactions for guest user (local repo, no network involved)', async () => {
    mockIsGuest = true;
    mockListTransactions.mockResolvedValueOnce({ items: [{ id: 'local-t1' }], total: 1 });

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { result } = await renderHook(() => useTransactions(), {
      wrapper: makeWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockListTransactions).toHaveBeenCalledTimes(1);
    expect(result.current.data).toEqual({ items: [{ id: 'local-t1' }], total: 1 });
  });
});

describe('transaction mutations invalidate account balances', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockInitialized = true;
    mockIsGuest = false;
  });

  it('useCreateTransaction invalidates both transactions and accounts on success', async () => {
    mockCreateTransaction.mockResolvedValueOnce({ id: 'generated-id' });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = await renderHook(() => useCreateTransaction(), {
      wrapper: makeWrapper(queryClient),
    });

    await result.current.mutateAsync({
      account_id: 'a1',
      category_id: null,
      amount: -50000,
      occurred_at: new Date().toISOString(),
    } as never);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['transactions'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['accounts'] });
  });

  it('useUpdateTransaction invalidates both transactions and accounts on success', async () => {
    mockUpdateTransaction.mockResolvedValueOnce({ id: 't1' });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = await renderHook(() => useUpdateTransaction('t1'), {
      wrapper: makeWrapper(queryClient),
    });

    await result.current.mutateAsync({ amount: -75000 } as never);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['transactions'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['accounts'] });
  });

  it('useDeleteTransaction invalidates both transactions and accounts on success', async () => {
    mockDeleteTransaction.mockResolvedValueOnce(undefined);
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = await renderHook(() => useDeleteTransaction(), {
      wrapper: makeWrapper(queryClient),
    });

    await result.current.mutateAsync('t1');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['transactions'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['accounts'] });
  });
});
