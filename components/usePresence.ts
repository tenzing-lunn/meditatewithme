'use client';

import { useEffect, useState } from 'react';

/**
 * Presence: tell the server we're here, and read back how many others are.
 *
 * Lives here rather than in lib/ because it is inherently browser-side —
 * localStorage, timers, the visibility API. lib/ stays pure and unit-testable.
 *
 * WHO COUNTS
 * Everyone on the page, not only those who have pressed Begin. That is a
 * product decision, and it has one obvious failure: a tab left open overnight
 * would report a meditator who went to bed.
 *
 * The fix is the visibility API rather than a shorter window. We stop
 * heartbeating the moment the tab is hidden, and /api/count already ignores
 * heartbeats older than 90 seconds — so a forgotten tab drops out of the count
 * about a minute and a half after it stops being looked at, without any
 * server-side change. "Everyone on the page" ends up meaning "everyone with the
 * page actually in front of them", which is both what was asked for and true.
 *
 * It also costs less: a backgrounded tab makes no requests at all.
 */

const HEARTBEAT_MS = 30_000;
const COUNT_POLL_MS = 15_000;
const ANON_KEY = 'mwm.anonId';

/**
 * A stable per-browser id.
 *
 * One person on two devices counts twice. That is a known and accepted
 * inaccuracy — see the open questions in context/ARCHITECTURE.md. The
 * alternative is asking people to identify themselves before they can sit,
 * which is worse.
 *
 * Storage can throw outright in private modes, so every access is guarded and
 * falls back to a session-lived id. Losing the id costs nothing: it means one
 * extra row in a table that is discarded hourly.
 */
function loadAnonId(): string {
  const fresh = () =>
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : // Only reached on very old browsers. The server validates the shape,
        // so this has to look like a real v4 uuid.
        '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, (c) =>
          (
            Number(c) ^
            (Math.random() * 16)
          ).toString(16),
        );

  try {
    const existing = window.localStorage.getItem(ANON_KEY);
    if (existing) return existing;
    const id = fresh();
    window.localStorage.setItem(ANON_KEY, id);
    return id;
  } catch {
    return fresh();
  }
}

export interface Presence {
  /** People present now. Null while unknown, or if the count is degraded. */
  count: number | null;
}

export function usePresence(): Presence {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    const anonId = loadAnonId();

    let beatTimer: number | undefined;
    let pollTimer: number | undefined;
    let stopped = false;

    const beat = async () => {
      try {
        await fetch('/api/heartbeat', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ anonId }),
          keepalive: true,
        });
      } catch {
        // Non-fatal. A missed heartbeat means being uncounted for 30 seconds,
        // which nobody can perceive. It must never interrupt a sitting.
      }
    };

    const poll = async () => {
      try {
        const res = await fetch('/api/count');
        if (!res.ok) return;
        const body = (await res.json()) as { count: number | null };
        if (!stopped) setCount(body.count);
      } catch {
        // Leave the last known number on screen rather than blanking it.
      }
    };

    const start = () => {
      void beat();
      void poll();
      beatTimer = window.setInterval(() => void beat(), HEARTBEAT_MS);
      pollTimer = window.setInterval(() => void poll(), COUNT_POLL_MS);
    };

    const stop = () => {
      window.clearInterval(beatTimer);
      window.clearInterval(pollTimer);
      beatTimer = undefined;
      pollTimer = undefined;
    };

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        // Restart with an immediate beat — coming back to the tab should put
        // you in the count straight away, not up to 30 seconds later.
        if (beatTimer === undefined) start();
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

  return { count };
}
