// The tick the sitting reads, on the phone: the site's `useClock`. `now` is
// the session clock, corrected against the site's `/api/time` by
// `lib/clock.ts` (handed a fetch that knows where the site is), and null
// until the first sync has answered, so nothing that depends on the hour is
// drawn from the phone's own clock — Begin waits for it, as on the site;
// `mono` is `performance.now()` on the same tick, for the personal timer,
// and ticks from the start. The two are never substituted for one another.
// Synced on launch and again whenever the app comes back to the front,
// since a phone sleeps.
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { serverNow, syncClock } from '../lib/clock';
import { SITE } from './auth';

export interface Clock {
  /** Server-corrected wall time, or null until the first sync has landed. */
  now: number | null;
  /** `performance.now()` at the same tick. */
  mono: number;
}

const toSite: typeof fetch = (input, init) => fetch(new URL(String(input), SITE).toString(), init);

export function useClock(): Clock {
  const [now, setNow] = useState<number | null>(null);
  const [mono, setMono] = useState(0);

  useEffect(() => {
    let frame: ReturnType<typeof setTimeout>;
    let live = true;
    // The first answer, good or not: a failed sync falls back to the
    // phone's clock, as the site does.
    let answered = false;
    const tick = () => {
      if (!live) return;
      if (answered) setNow(serverNow());
      setMono(performance.now());
      frame = setTimeout(tick, 250);
    };
    tick();
    void syncClock(toSite).then(() => {
      answered = true;
    });
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void syncClock(toSite);
    });
    return () => {
      live = false;
      clearTimeout(frame);
      sub.remove();
    };
  }, []);

  return { now, mono };
}
