'use client';

import { useEffect, useState } from 'react';
import { syncClock, serverNow } from '@/lib/clock';
import {
  sessionPhase,
  msUntilNextSession,
  msLeftInSession,
  nextHourStart,
} from '@/lib/session';

/**
 * The holding page's proof of life: the session engine running in a browser.
 *
 * Everything here is read off the corrected clock rather than counted down, so
 * a sleeping laptop or a backgrounded tab resyncs instead of drifting. Step 03
 * absorbs this into Room.tsx — the logic stays, the presentation changes.
 */

function mmss(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function SessionCountdown() {
  // Null until mounted. The server has no idea what time the client thinks it
  // is, so rendering a time on the server guarantees a hydration mismatch.
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    let frame: number;

    const tick = () => {
      setNow(serverNow());
      frame = window.setTimeout(tick, 250) as unknown as number;
    };

    // Failure is non-fatal — syncClock falls back to a zero offset.
    void syncClock().then(tick);

    const onFocus = () => void syncClock();
    window.addEventListener('focus', onFocus);

    return () => {
      window.clearTimeout(frame);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  if (now === null) {
    return (
      <p className="font-mono text-sm tracking-[0.13em] text-ink-3 uppercase">
        Finding the hour…
      </p>
    );
  }

  const phase = sessionPhase(now);
  const startsAt = nextHourStart(now);

  return (
    <div className="space-y-3">
      <p className="font-mono text-sm tracking-[0.13em] text-ember uppercase">
        {phase === 'active' ? 'Session in progress' : 'Next session'}
      </p>

      <p className="font-serif text-6xl leading-none tabular-nums sm:text-7xl">
        {phase === 'active'
          ? mmss(msLeftInSession(now))
          : mmss(msUntilNextSession(now))}
      </p>

      <p className="text-ink-2">
        {phase === 'active' ? (
          'remaining in this sitting'
        ) : (
          <>
            begins at{' '}
            {startsAt.toLocaleTimeString([], {
              hour: 'numeric',
              minute: '2-digit',
            })}{' '}
            your time
          </>
        )}
      </p>
    </div>
  );
}
