import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';

jest.mock('@/features/account/api/deleteAccount', () => ({
  deleteAccount: jest.fn(),
}));

import { deleteAccount } from '@/features/account/api/deleteAccount';
import { useDeleteAccount } from '@/features/account/hooks/useDeleteAccount';

const mockDelete = deleteAccount as jest.MockedFunction<typeof deleteAccount>;

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

describe('useDeleteAccount', () => {
  beforeEach(() => jest.clearAllMocks());

  it('calls the delete-account API', async () => {
    mockDelete.mockResolvedValueOnce(undefined);

    const { result } = await renderHook(() => useDeleteAccount(), { wrapper: makeWrapper() });

    await act(async () => {
      await result.current.mutateAsync();
    });

    expect(mockDelete).toHaveBeenCalledTimes(1);
  });

  it('exposes error state when deletion fails', async () => {
    mockDelete.mockRejectedValueOnce(new Error('boom'));

    const { result } = await renderHook(() => useDeleteAccount(), { wrapper: makeWrapper() });

    await act(async () => {
      await result.current.mutateAsync().catch(() => undefined);
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
