import { renderHook } from '@testing-library/react-native';

import { useIdTimeoutBackstop } from '@/hooks/useIdTimeoutBackstop';

describe('useIdTimeoutBackstop', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('calls onTimeout for an id that stays active past the timeout', async () => {
    const onTimeout = jest.fn();
    await renderHook(() => useIdTimeoutBackstop(['a'], 1000, onTimeout));

    jest.advanceTimersByTime(1000);

    expect(onTimeout).toHaveBeenCalledWith('a');
  });

  it('does not call onTimeout before the timeout elapses', async () => {
    const onTimeout = jest.fn();
    await renderHook(() => useIdTimeoutBackstop(['a'], 1000, onTimeout));

    jest.advanceTimersByTime(999);

    expect(onTimeout).not.toHaveBeenCalled();
  });

  it('does not call onTimeout for an id removed before it fires', async () => {
    const onTimeout = jest.fn();
    const { rerender } = await renderHook<void, { ids: string[] }>(({ ids }) => useIdTimeoutBackstop(ids, 1000, onTimeout), {
      initialProps: { ids: ['a'] },
    });

    await rerender({ ids: [] });
    jest.advanceTimersByTime(1000);

    expect(onTimeout).not.toHaveBeenCalled();
  });

  it('does not restart the timer when the same id is passed again on rerender', async () => {
    const onTimeout = jest.fn();
    const { rerender } = await renderHook<void, { ids: string[] }>(({ ids }) => useIdTimeoutBackstop(ids, 1000, onTimeout), {
      initialProps: { ids: ['a'] },
    });

    jest.advanceTimersByTime(600);
    await rerender({ ids: ['a'] });
    jest.advanceTimersByTime(400);

    expect(onTimeout).toHaveBeenCalledTimes(1);
  });

  it('tracks multiple ids independently', async () => {
    const onTimeout = jest.fn();
    const { rerender } = await renderHook<void, { ids: string[] }>(({ ids }) => useIdTimeoutBackstop(ids, 1000, onTimeout), {
      initialProps: { ids: ['a'] },
    });

    jest.advanceTimersByTime(500);
    await rerender({ ids: ['a', 'b'] });
    jest.advanceTimersByTime(500);

    expect(onTimeout).toHaveBeenCalledWith('a');
    expect(onTimeout).not.toHaveBeenCalledWith('b');

    jest.advanceTimersByTime(500);
    expect(onTimeout).toHaveBeenCalledWith('b');
  });

  it('clears pending timers on unmount', async () => {
    const onTimeout = jest.fn();
    const { unmount } = await renderHook(() => useIdTimeoutBackstop(['a'], 1000, onTimeout));

    await unmount();
    jest.advanceTimersByTime(1000);

    expect(onTimeout).not.toHaveBeenCalled();
  });
});
