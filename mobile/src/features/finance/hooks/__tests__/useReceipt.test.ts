import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

const mockGetReceiptStatus = jest.fn();

jest.mock('@/features/finance/api/receipt', () => ({
  getReceiptStatus: (id: string) => mockGetReceiptStatus(id),
  uploadReceipt: jest.fn(),
}));

import { useReceiptStatuses } from '@/features/finance/hooks/useReceipt';

function makeWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

describe('useReceiptStatuses', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('polls every id passed in, independently', async () => {
    mockGetReceiptStatus.mockImplementation((id: string) =>
      Promise.resolve({
        id,
        status: 'extracting',
        extracted_data: [],
        transaction_ids: [],
        error_message: null,
      })
    );

    const { result } = await renderHook(() => useReceiptStatuses(['r1', 'r2']), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.every((q) => q.isSuccess)).toBe(true));

    expect(mockGetReceiptStatus).toHaveBeenCalledWith('r1');
    expect(mockGetReceiptStatus).toHaveBeenCalledWith('r2');
    expect(result.current).toHaveLength(2);
  });

  it('returns an empty array when there are no active ids', async () => {
    const { result } = await renderHook(() => useReceiptStatuses([]), {
      wrapper: makeWrapper(),
    });

    expect(result.current).toEqual([]);
    expect(mockGetReceiptStatus).not.toHaveBeenCalled();
  });

  it('stops refetching a receipt once it reaches a terminal status', async () => {
    mockGetReceiptStatus.mockResolvedValue({
      id: 'r1',
      status: 'completed',
      extracted_data: [],
      transaction_ids: [],
      error_message: null,
    });

    const { result } = await renderHook(() => useReceiptStatuses(['r1']), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current[0]?.isSuccess).toBe(true));

    expect(result.current[0]?.data?.status).toBe('completed');
  });
});
