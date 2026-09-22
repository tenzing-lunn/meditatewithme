'use client';

import { useCallback, useEffect, useRef } from 'react';

/**
 * The screen stays on for the length of a sitting. A phone locks within a
 * minute of the person closing their eyes, and a locked phone suspends the
 * audio graph, so the bell is late and the heartbeats stop — the one promise
 * of the product failing in the normal posture of meditation.
 *
 * `request()` is called inside the click that strikes the bowl; `release()`
 * at the end of the sitting. The browser drops the sentinel on its own when
 * the tab hides, so while the lock is wanted it is asked for again each time
 * the tab comes back. Unsupported is a silent no-op, and a refusal (low
 * battery, a hidden document) is swallowed: none of this may interrupt a
 * sitting.
 */
export function useWakeLock() {
  const wantedRef = useRef(false);
  const sentinelRef = useRef<WakeLockSentinel | null>(null);

  const acquire = useCallback(async () => {
    if (typeof navigator === 'undefined' || !('wakeLock' in navigator)) return;
    if (sentinelRef.current && !sentinelRef.current.released) return;
    try {
      const sentinel = await navigator.wakeLock.request('screen');
      // Released while the request was in flight.
      if (!wantedRef.current) {
        void sentinel.release().catch(() => {});
        return;
      }
      sentinelRef.current = sentinel;
    } catch {
      // The screen may lock. The sitting goes on.
    }
  }, []);

  const request = useCallback(() => {
    wantedRef.current = true;
    void acquire();
  }, [acquire]);

  const release = useCallback(() => {
    wantedRef.current = false;
    const sentinel = sentinelRef.current;
    sentinelRef.current = null;
    void sentinel?.release().catch(() => {});
  }, []);

  useEffect(() => {
    const onVisibility = () => {
      if (wantedRef.current && document.visibilityState === 'visible') void acquire();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [acquire]);

  return { request, release };
}
