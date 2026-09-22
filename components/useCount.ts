'use client';

import { useEffect, useState } from 'react';

/**
 * How many people are in the hour, read and not joined.
 *
 * WHY THIS IS NOT `usePresence`
 * `usePresence` does two things: it writes a heartbeat, and it reads the count.
 * Those are one hook because in the room they are one act — being on the page
 * IS being in the count, which is what §14 settled and what makes the wording
 * "here" honest.
 *
 * Home is not being in the room. Somebody reading their own streak on a
 * dashboard has not lit anything, and heartbeating from here would put them in
 * a number that claims they had. So this reads and never writes, and Home uses
 * it rather than the hook that would enrol them.
 *
 * The read is free to duplicate in a way the write would not be: `/api/count`
 * is edge-cached for ten seconds and identical for every viewer — that is the
 * whole of §5 — so a second reader costs one cache hit. A second *writer* would
 * have been a second row.
 */

const POLL_MS = 15_000;

export interface CountReading {
  /** People present now. Null while unknown, or if the count is degraded. */
  count: number | null;
  /** People who have lit this hour, including people who have since left. */
  litCount: number | null;
}

export function useCount(): CountReading {
  const [reading, setReading] = useState<CountReading>({
    count: null,
    litCount: null,
  });

  useEffect(() => {
    let stopped = false;
    let timer: number | undefined;

    // One missed poll keeps the last number: a blink of network is not worth
    // a line vanishing. Two in a row (thirty seconds) and it goes null, the
    // same rule as `usePresence` and `useWorld`, so Home's line says nothing
    // rather than something old. No error is shown either way.
    let misses = 0;
    const missed = () => {
      misses += 1;
      if (misses >= 2 && !stopped) {
        setReading({ count: null, litCount: null });
      }
    };

    const poll = async () => {
      try {
        const res = await fetch('/api/count');
        if (!res.ok) {
          missed();
          return;
        }
        const body = (await res.json()) as CountReading;
        misses = 0;
        if (!stopped) {
          setReading({ count: body.count, litCount: body.litCount });
        }
      } catch {
        missed();
      }
    };

    const start = () => {
      void poll();
      timer = window.setInterval(() => void poll(), POLL_MS);
    };

    const stop = () => {
      window.clearInterval(timer);
      timer = undefined;
    };

    // A backgrounded tab makes no requests at all, same as the room.
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        if (timer === undefined) start();
      } else {
        stop();
      }
    };

    if (document.visibilityState === 'visible') start();
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      stopped = true;
      stop();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  return reading;
}
