'use client';

import { useEffect, useState } from 'react';
import { ambientSession, fromWire, type SessionWire } from '@/lib/session';
import type { Session } from '@/lib/types';

/**
 * The session for the hour we are in.
 *
 * Never returns null once the hour is known, and never surfaces an error. The
 * architecture guarantees a session exists for every hour whether or not a row
 * does, so "we don't know yet" and "the fetch failed" have the same correct
 * answer: the ambient candle. Rendering a loading state or an error for
 * something we can always compute would be inventing a problem.
 *
 * That means the ambient default is set synchronously and the fetch can only
 * ever refine it. Nobody waits on the network to see a candle.
 *
 * Keyed on the hour: pass `hourKey(now)` and the session re-resolves when the
 * clock rolls over, which is the only moment it can change.
 */
export function useSession(hourKey: string | null): Session | null {
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    if (!hourKey) return;

    setSession(ambientSession(new Date(hourKey)));

    let cancelled = false;

    fetch('/api/session')
      .then((r) => (r.ok ? (r.json() as Promise<SessionWire>) : null))
      .then((wire) => {
        if (cancelled || !wire) return;
        // The hour can roll over while this is in flight, and the edge may hand
        // back a cached copy of the hour we just left. Either way, applying a
        // session from the wrong hour would show the previous hour's focus.
        if (wire.hourStart !== hourKey) return;
        setSession(fromWire(wire));
      })
      .catch(() => {
        // Already showing the ambient default, which is the right answer.
      });

    return () => {
      cancelled = true;
    };
  }, [hourKey]);

  return session;
}
