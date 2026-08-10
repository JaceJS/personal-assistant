import React from 'react';
import { render } from '@testing-library/react-native';

jest.mock('@/features/finance/hooks/useTransactions', () => ({
  useTransactions: jest.fn(),
}));

jest.mock('@/components/ui/Skeleton', () => ({
  SkeletonCard: jest.fn(() => null),
}));

import { useTransactions } from '@/features/finance/hooks/useTransactions';
import ProjectedEndOfMonthCard from '@/features/finance/components/ProjectedEndOfMonthCard';

const mockUseTransactions = useTransactions as jest.MockedFunction<typeof useTransactions>;

describe('ProjectedEndOfMonthCard', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders skeleton while either month is loading', async () => {
    mockUseTransactions.mockReturnValue({
      data: undefined,
      isLoading: true,
    } as ReturnType<typeof useTransactions>);

    const { getByTestId, queryByText } = await render(<ProjectedEndOfMonthCard />);

    expect(getByTestId('projected-eom-skeleton')).toBeTruthy();
    expect(queryByText(/belum ada|no data/i)).toBeNull();
  });

  it('renders projection once both months have loaded', async () => {
    mockUseTransactions.mockReturnValue({
      data: { items: [{ id: 't1', amount: 100000 }] },
      isLoading: false,
    } as unknown as ReturnType<typeof useTransactions>);

    const { queryByTestId } = await render(<ProjectedEndOfMonthCard />);

    expect(queryByTestId('projected-eom-skeleton')).toBeNull();
  });
});
