import { useEffect, useRef } from "react";

// Starts one timer per id, independent of the others; fires onTimeout once
// per id and stops tracking ids no longer in `activeIds`.
export function useIdTimeoutBackstop(
  activeIds: string[],
  timeoutMs: number,
  onTimeout: (id: string) => void,
): void {
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    const activeSet = new Set(activeIds);

    for (const id of activeIds) {
      if (timers.current.has(id)) continue;
      timers.current.set(
        id,
        setTimeout(() => {
          timers.current.delete(id);
          onTimeout(id);
        }, timeoutMs)
      );
    }

    for (const [id, timer] of timers.current) {
      if (!activeSet.has(id)) {
        clearTimeout(timer);
        timers.current.delete(id);
      }
    }
  }, [activeIds, timeoutMs, onTimeout]);

  useEffect(() => {
    const timerMap = timers.current;
    return () => {
      for (const timer of timerMap.values()) clearTimeout(timer);
      timerMap.clear();
    };
  }, []);
}
