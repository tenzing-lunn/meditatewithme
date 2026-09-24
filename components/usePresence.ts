'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

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
 *
 * With one exception. A tab that is *sitting* keeps beating while hidden: a
 * phone that locked with its owner's eyes shut is the normal posture of
 * meditation, not a forgotten tab, and the sitter must stay in the count.
 * The fetch has `keepalive` for exactly this. When the sitting ends while
 * the tab is still hidden, the beats stop then.
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
  /** People who have lit this hour, including people who have since left. */
  litCount: number | null;
  /** Record a Begin and return the number who began in the same short window. */
  begin: () => Promise<number | null>;
}

/**
 * `label` is "Ana from Lisbon" while the person is sitting with others and
 * has chosen to be seen, and null otherwise. It rides on every beat, so the
 * server's copy lasts exactly as long as that; a change beats at once, so
 * a name appears within one poll and disappears the moment the sitting
 * ends.
 *
 * `sitting` is true for the length of a sitting. While it is, hiding the tab
 * does not stop the heartbeat.
 */
export function usePresence({
  label = null,
  sitting = false,
}: { label?: string | null; sitting?: boolean } = {}): Presence {
  const [count, setCount] = useState<number | null>(null);
  const [litCount, setLitCount] = useState<number | null>(null);
  const anonIdRef = useRef<string | null>(null);
  const labelRef = useRef(label);
  labelRef.current = label;
  const sittingRef = useRef(sitting);
  sittingRef.current = sitting;
  const beatRef = useRef<(() => Promise<void>) | null>(null);
  const stopRef = useRef<(() => void) | null>(null);

  const begin = useCallback(async () => {
    const anonId = anonIdRef.current;
    if (!anonId) return null;

    try {
      const res = await fetch('/api/heartbeat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ anonId, began: true, label: labelRef.current }),
        keepalive: true,
      });
      if (!res.ok) return null;
      const body = (await res.json()) as { beganCount?: unknown };
      return typeof body.beganCount === 'number' ? body.beganCount : null;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    const anonId = loadAnonId();
    anonIdRef.current = anonId;

    let beatTimer: number | undefined;
    let pollTimer: number | undefined;
    let stopped = false;

    const beat = async () => {
      try {
        await fetch('/api/heartbeat', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ anonId, label: labelRef.current }),
          keepalive: true,
        });
      } catch {
        // Non-fatal. A missed heartbeat means being uncounted for 30 seconds,
        // which nobody can perceive. It must never interrupt a sitting.
      }
    };

    // One missed poll keeps the last number: a blink of network is not worth
    // a line vanishing. Two in a row (thirty seconds) and it goes null, so
    // the company line says nothing rather than something old.
    let misses = 0;
    const missed = () => {
      misses += 1;
      if (misses >= 2 && !stopped) {
        setCount(null);
        setLitCount(null);
      }
    };

    const poll = async () => {
      try {
        const res = await fetch('/api/count');
        if (!res.ok) {
          missed();
          return;
        }
        const body = (await res.json()) as {
          count: number | null;
          litCount: number | null;
        };
        misses = 0;
        if (!stopped) {
          setCount(body.count);
          setLitCount(body.litCount);
        }
      } catch {
        missed();
      }
    };

    beatRef.current = beat;

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

    stopRef.current = stop;

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        // Restart with an immediate beat — coming back to the tab should put
        // you in the count straight away, not up to 30 seconds later.
        if (beatTimer === undefined) start();
      } else if (!sittingRef.current) {
        stop();
      }
    };

    if (document.visibilityState === 'visible') start();
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      stopped = true;
      anonIdRef.current = null;
      beatRef.current = null;
      stopRef.current = null;
      stop();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  // A label arriving or leaving is worth a beat of its own.
  useEffect(() => {
    void beatRef.current?.();
  }, [label]);

  // A sitting that ends in a hidden tab is a forgotten tab from then on.
  useEffect(() => {
    if (!sitting && document.visibilityState !== 'visible') stopRef.current?.();
  }, [sitting]);

  return { count, litCount, begin };
}
