import React from 'react';
import { act, render } from '@testing-library/react-native';

jest.mock('@/features/finance/hooks/useAccounts', () => ({
  useAccounts: jest.fn(),
}));

jest.mock('@/features/finance/hooks/useTransactions', () => ({
  useTransactions: jest.fn(),
}));

jest.mock('@/components/ui/Skeleton', () => ({
  SkeletonBalanceCard: jest.fn(() => null),
}));

import { useAccounts } from '@/features/finance/hooks/useAccounts';
import { useTransactions } from '@/features/finance/hooks/useTransactions';
import AccountBalanceCard from '@/features/finance/components/AccountBalanceCard';

const mockUseAccounts = useAccounts as jest.MockedFunction<typeof useAccounts>;
const mockUseTransactions = useTransactions as jest.MockedFunction<typeof useTransactions>;

describe('AccountBalanceCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });
  afterEach(() => jest.useRealTimers());

  it('renders skeleton while accounts are loading', async () => {
    mockUseAccounts.mockReturnValue({
      data: undefined,
      isLoading: true,
    } as ReturnType<typeof useAccounts>);
    mockUseTransactions.mockReturnValue({
      data: undefined,
      isLoading: true,
    } as ReturnType<typeof useTransactions>);

    const { getByTestId, queryByText } = await render(<AccountBalanceCard />);
    await act(async () => jest.advanceTimersByTime(200));

    expect(getByTestId('account-balance-skeleton')).toBeTruthy();
    expect(queryByText(/tambah akun|add.*account/i)).toBeNull();
  });

  it('renders real balance once accounts have loaded', async () => {
    mockUseAccounts.mockReturnValue({
      data: [{ id: 'a1', balance: 50000, is_archived: false }],
      isLoading: false,
    } as unknown as ReturnType<typeof useAccounts>);
    mockUseTransactions.mockReturnValue({
      data: { items: [{ id: 't1' }] },
      isLoading: false,
    } as unknown as ReturnType<typeof useTransactions>);

    const { queryByTestId } = await render(<AccountBalanceCard />);

    expect(queryByTestId('account-balance-skeleton')).toBeNull();
  });
});
