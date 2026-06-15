import React from 'react';
import { render } from '@testing-library/react-native';

jest.mock('@/features/ai/hooks/useAIInsight', () => ({
  useAIInsight: jest.fn(),
}));

jest.mock('@/components/ui/Skeleton', () => ({
  SkeletonCard: jest.fn(() => null),
}));

import { useAIInsight } from '@/features/ai/hooks/useAIInsight';
import { AIInsightCard } from '@/features/ai/components/AIInsightCard';

const mockUseAIInsight = useAIInsight as jest.MockedFunction<typeof useAIInsight>;

describe('AIInsightCard', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders insight text when data is available', async () => {
    mockUseAIInsight.mockReturnValue({
      data: { insight: 'You are on budget. Great job!', generated_at: '2026-06-15T00:00:00Z', is_cached: false },
      isLoading: false,
      isError: false,
    } as ReturnType<typeof useAIInsight>);

    const { getByText } = await render(<AIInsightCard />);

    expect(getByText('You are on budget. Great job!')).toBeTruthy();
  });

  it('renders skeleton when loading', async () => {
    mockUseAIInsight.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    } as ReturnType<typeof useAIInsight>);

    const { queryByText, getByTestId } = await render(<AIInsightCard />);

    expect(queryByText(/budget|spend|insight/i)).toBeNull();
    expect(getByTestId('ai-insight-skeleton')).toBeTruthy();
  });

  it('renders fallback text on error', async () => {
    mockUseAIInsight.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
    } as ReturnType<typeof useAIInsight>);

    const { getByTestId } = await render(<AIInsightCard />);

    expect(getByTestId('ai-insight-fallback')).toBeTruthy();
  });

  it('is not pressable (pure display component)', async () => {
    mockUseAIInsight.mockReturnValue({
      data: { insight: 'Test insight', generated_at: '2026-06-15T00:00:00Z', is_cached: false },
      isLoading: false,
      isError: false,
    } as ReturnType<typeof useAIInsight>);

    const { toJSON } = await render(<AIInsightCard />);
    const json = JSON.stringify(toJSON());

    expect(json).not.toContain('"onPress"');
  });
});
