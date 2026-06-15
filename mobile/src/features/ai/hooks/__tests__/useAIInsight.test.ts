import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

jest.mock('@/features/ai/api/insight', () => ({
  fetchDailyInsight: jest.fn(),
}));

import { fetchDailyInsight } from '@/features/ai/api/insight';
import { useAIInsight } from '@/features/ai/hooks/useAIInsight';

const mockFetch = fetchDailyInsight as jest.MockedFunction<typeof fetchDailyInsight>;

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

describe('useAIInsight', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns insight data on success', async () => {
    mockFetch.mockResolvedValueOnce({
      insight: 'You are on budget. Keep it up!',
      generated_at: '2026-06-15T00:00:00Z',
      is_cached: false,
    });

    const { result } = await renderHook(() => useAIInsight(), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.insight).toBe('You are on budget. Keep it up!');
  });

  it('starts in loading state', async () => {
    mockFetch.mockImplementationOnce(() => new Promise(() => {})); // never resolves

    const { result } = await renderHook(() => useAIInsight(), { wrapper: makeWrapper() });

    expect(result.current.isLoading).toBe(true);
  });

  it('exposes error state on API failure', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const { result } = await renderHook(() => useAIInsight(), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
