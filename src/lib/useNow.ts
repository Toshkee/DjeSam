import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

/**
 * Current time, refreshed on an interval while the app is in the foreground and immediately on
 * resume. Purely for display — expiry alerts are OS-scheduled notifications, not JS timers.
 */
export function useNow(intervalMs = 15_000, enabled = true): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!enabled) return undefined;
    let timer: ReturnType<typeof setInterval> | null = null;
    const start = () => {
      setNow(Date.now());
      if (!timer) timer = setInterval(() => setNow(Date.now()), intervalMs);
    };
    const stop = () => {
      if (timer) clearInterval(timer);
      timer = null;
    };
    start();
    const sub = AppState.addEventListener('change', (s) => (s === 'active' ? start() : stop()));
    return () => {
      stop();
      sub.remove();
    };
  }, [intervalMs, enabled]);

  return now;
}
