import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

const mockListCategories = jest.fn();

jest.mock('@/features/finance/repository', () => ({
  useFinanceRepository: () => ({ listCategories: mockListCategories }),
}));

let mockInitialized = true;
let mockIsGuest = false;
jest.mock('@/stores/auth', () => ({
  useAuthStore: (selector: (s: { initialized: boolean; isGuest: boolean }) => unknown) =>
    selector({ initialized: mockInitialized, isGuest: mockIsGuest }),
}));

import { useCategories } from '@/features/finance/hooks/useCategories';

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

describe('useCategories auth guard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockInitialized = true;
    mockIsGuest = false;
  });

  it('does not fetch before auth is initialized (cold-start race)', async () => {
    mockInitialized = false;

    const { result } = await renderHook(() => useCategories(), { wrapper: makeWrapper() });

    expect(result.current.fetchStatus).toBe('idle');
    expect(mockListCategories).not.toHaveBeenCalled();
  });

  it('fetches categories once auth is initialized', async () => {
    mockListCategories.mockResolvedValueOnce([{ id: 'c1', name: 'Makanan' }]);

    const { result } = await renderHook(() => useCategories(), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockListCategories).toHaveBeenCalledTimes(1);
  });

  it('fetches categories for guest user (local repo, no network involved)', async () => {
    mockIsGuest = true;
    mockListCategories.mockResolvedValueOnce([{ id: 'local-c1', name: 'Makanan' }]);

    const { result } = await renderHook(() => useCategories(), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockListCategories).toHaveBeenCalledTimes(1);
    expect(result.current.data).toEqual([{ id: 'local-c1', name: 'Makanan' }]);
  });
});
