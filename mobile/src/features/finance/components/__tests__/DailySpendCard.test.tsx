import React from 'react';
import { render } from '@testing-library/react-native';

jest.mock('@/features/finance/hooks/useBudget', () => ({
  useBudget: jest.fn(),
}));

jest.mock('@/features/finance/hooks/useTransactions', () => ({
  useTransactions: jest.fn(),
}));

jest.mock('@/components/ui/Skeleton', () => ({
  SkeletonCard: jest.fn(() => null),
}));

import { useBudget } from '@/features/finance/hooks/useBudget';
import { useTransactions } from '@/features/finance/hooks/useTransactions';
import DailySpendCard from '@/features/finance/components/DailySpendCard';

const mockUseBudget = useBudget as jest.MockedFunction<typeof useBudget>;
const mockUseTransactions = useTransactions as jest.MockedFunction<typeof useTransactions>;

describe('DailySpendCard', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders skeleton while budget or today transactions are loading', async () => {
    mockUseBudget.mockReturnValue({
      data: undefined,
      isLoading: true,
    } as ReturnType<typeof useBudget>);
    mockUseTransactions.mockReturnValue({
      data: undefined,
      isLoading: true,
    } as ReturnType<typeof useTransactions>);

    const { getByTestId, queryByText } = await render(<DailySpendCard />);

    expect(getByTestId('daily-spend-skeleton')).toBeTruthy();
    expect(queryByText(/0%/)).toBeNull();
  });

  it('renders the ring once budget and transactions have loaded', async () => {
    mockUseBudget.mockReturnValue({
      data: { monthly_limit: 3000000 },
      isLoading: false,
    } as unknown as ReturnType<typeof useBudget>);
    mockUseTransactions.mockReturnValue({
      data: { items: [] },
      isLoading: false,
    } as unknown as ReturnType<typeof useTransactions>);

    const { queryByTestId } = await render(<DailySpendCard />);

    expect(queryByTestId('daily-spend-skeleton')).toBeNull();
  });
});
