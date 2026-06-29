import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

const mockListAccounts = jest.fn();

jest.mock('@/features/finance/repository', () => ({
  useFinanceRepository: () => ({ listAccounts: mockListAccounts }),
}));

let mockInitialized = true;
jest.mock('@/stores/auth', () => ({
  useAuthStore: (selector: (s: { initialized: boolean }) => unknown) =>
    selector({ initialized: mockInitialized }),
}));

import { useAccounts } from '@/features/finance/hooks/useAccounts';

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

describe('useAccounts auth guard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockInitialized = true;
  });

  it('does not fetch before auth is initialized (cold-start race)', async () => {
    mockInitialized = false;

    const { result } = await renderHook(() => useAccounts(), { wrapper: makeWrapper() });

    expect(result.current.fetchStatus).toBe('idle');
    expect(mockListAccounts).not.toHaveBeenCalled();
  });

  it('fetches accounts once auth is initialized', async () => {
    mockInitialized = true;
    mockListAccounts.mockResolvedValueOnce([{ id: 'a1', name: 'Cash' }]);

    const { result } = await renderHook(() => useAccounts(), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockListAccounts).toHaveBeenCalledTimes(1);
    expect(result.current.data).toEqual([{ id: 'a1', name: 'Cash' }]);
  });
});
