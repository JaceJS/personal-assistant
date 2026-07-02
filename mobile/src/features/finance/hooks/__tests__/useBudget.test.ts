import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

const mockGetBudget = jest.fn();

jest.mock('@/features/finance/repository', () => ({
  useFinanceRepository: () => ({ getBudget: mockGetBudget }),
}));

let mockInitialized = true;
let mockIsGuest = false;
jest.mock('@/stores/auth', () => ({
  useAuthStore: (selector: (s: { initialized: boolean; isGuest: boolean }) => unknown) =>
    selector({ initialized: mockInitialized, isGuest: mockIsGuest }),
}));

import { useBudget } from '@/features/finance/hooks/useBudget';

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

describe('useBudget auth guard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockInitialized = true;
    mockIsGuest = false;
  });

  it('does not fetch before auth is initialized (cold-start race)', async () => {
    mockInitialized = false;

    const { result } = await renderHook(() => useBudget(), { wrapper: makeWrapper() });

    expect(result.current.fetchStatus).toBe('idle');
    expect(mockGetBudget).not.toHaveBeenCalled();
  });

  it('fetches budget once auth is initialized', async () => {
    mockGetBudget.mockResolvedValueOnce({ id: 'b1', monthly_limit: 1000000 });

    const { result } = await renderHook(() => useBudget(), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockGetBudget).toHaveBeenCalledTimes(1);
  });

  it('fetches budget for guest user (local repo, no network involved)', async () => {
    mockIsGuest = true;
    mockGetBudget.mockResolvedValueOnce({ id: 'local-b1', monthly_limit: 500000 });

    const { result } = await renderHook(() => useBudget(), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockGetBudget).toHaveBeenCalledTimes(1);
    expect(result.current.data).toEqual({ id: 'local-b1', monthly_limit: 500000 });
  });
});
