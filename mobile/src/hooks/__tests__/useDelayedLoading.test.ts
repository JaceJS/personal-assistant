import { act, renderHook } from '@testing-library/react-native';

import { useDelayedLoading } from '@/hooks/useDelayedLoading';

const DELAY_MS = 200;
const MIN_DURATION_MS = 300;

describe('useDelayedLoading', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('starts false when not loading', async () => {
    const { result } = await renderHook(() => useDelayedLoading(false));
    expect(result.current).toBe(false);
  });

  it('does not show skeleton if loading resolves before the delay', async () => {
    const { result, rerender } = await renderHook<boolean, { isLoading: boolean }>(({ isLoading }) => useDelayedLoading(isLoading), {
      initialProps: { isLoading: true },
    });

    await act(async () => jest.advanceTimersByTime(DELAY_MS - 50));
    await rerender({ isLoading: false });
    await act(async () => jest.advanceTimersByTime(DELAY_MS));

    expect(result.current).toBe(false);
  });

  it('shows skeleton once loading outlasts the delay', async () => {
    const { result } = await renderHook(() => useDelayedLoading(true));

    await act(async () => jest.advanceTimersByTime(DELAY_MS - 1));
    expect(result.current).toBe(false);

    await act(async () => jest.advanceTimersByTime(1));
    expect(result.current).toBe(true);
  });

  it('keeps skeleton visible for the minimum duration even if loading finishes early', async () => {
    const { result, rerender } = await renderHook<boolean, { isLoading: boolean }>(({ isLoading }) => useDelayedLoading(isLoading), {
      initialProps: { isLoading: true },
    });

    await act(async () => jest.advanceTimersByTime(DELAY_MS));
    expect(result.current).toBe(true);

    await act(async () => jest.advanceTimersByTime(50));
    await rerender({ isLoading: false });

    await act(async () => jest.advanceTimersByTime(MIN_DURATION_MS - 50 - 1));
    expect(result.current).toBe(true);

    await act(async () => jest.advanceTimersByTime(1));
    expect(result.current).toBe(false);
  });

  it('hides immediately once loading finishes if the minimum duration already elapsed', async () => {
    const { result, rerender } = await renderHook<boolean, { isLoading: boolean }>(({ isLoading }) => useDelayedLoading(isLoading), {
      initialProps: { isLoading: true },
    });

    await act(async () => jest.advanceTimersByTime(DELAY_MS + MIN_DURATION_MS + 100));
    expect(result.current).toBe(true);

    await rerender({ isLoading: false });
    await act(async () => jest.advanceTimersByTime(0));

    expect(result.current).toBe(false);
  });
});
