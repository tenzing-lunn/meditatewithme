'use client';

import { useEffect, useState } from 'react';
import { serverNow, syncClock } from '@/lib/clock';

export interface Clock {
  /** Server-corrected wall time, or null until the first sync has landed. */
  now: number | null;
  /** `performance.now()` at the same tick, for monotonic countdowns. */
  mono: number;
}

/**
 * The tick every screen reads from. Four times a second is enough for a
 * clock that shows seconds; it syncs with `/api/time` on mount and again on
 * focus, since laptops sleep and wake with a clock NTP may have corrected in
 * the meantime. `now` is null until the first sync answers, so nothing that
 * depends on the hour is drawn from the device clock.
 */
export function useClock(): Clock {
  const [now, setNow] = useState<number | null>(null);
  const [mono, setMono] = useState(0);

  useEffect(() => {
    let frame: number;

    const tick = () => {
      setNow(serverNow());
      setMono(performance.now());
      frame = window.setTimeout(tick, 250);
    };

    void syncClock().then(tick);

    const onFocus = () => void syncClock();
    window.addEventListener('focus', onFocus);

    return () => {
      window.clearTimeout(frame);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  return { now, mono };
}
