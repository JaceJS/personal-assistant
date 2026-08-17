import { useEffect, useRef, useState } from "react";

const DEFAULT_DELAY_MS = 200;
const DEFAULT_MIN_DURATION_MS = 300;

interface UseDelayedLoadingOptions {
  delayMs?: number;
  minDurationMs?: number;
}

export function useDelayedLoading(
  isLoading: boolean,
  { delayMs = DEFAULT_DELAY_MS, minDurationMs = DEFAULT_MIN_DURATION_MS }: UseDelayedLoadingOptions = {}
): boolean {
  const [show, setShow] = useState(false);
  const shownAtRef = useRef<number | null>(null);

  useEffect(() => {
    if (isLoading) {
      const showTimer = setTimeout(() => {
        shownAtRef.current = Date.now();
        setShow(true);
      }, delayMs);
      return () => clearTimeout(showTimer);
    }

    if (shownAtRef.current === null) {
      setShow(false);
      return;
    }

    const elapsed = Date.now() - shownAtRef.current;
    const remaining = Math.max(minDurationMs - elapsed, 0);
    const hideTimer = setTimeout(() => {
      shownAtRef.current = null;
      setShow(false);
    }, remaining);
    return () => clearTimeout(hideTimer);
  }, [isLoading, delayMs, minDurationMs]);

  return show;
}
