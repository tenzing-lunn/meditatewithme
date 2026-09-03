'use client';

import { useEffect, useState } from 'react';
import type { WorldPoint } from '@/lib/geo';

/**
 * Where this hour's candles are.
 *
 * Reads and never writes, exactly like `useCount` and for the same reason:
 * looking at the earth is not sitting in the room, and nothing on this page may
 * put somebody into a count that says they are meditating.
 *
 * Polled at the same fifteen seconds as everything else. The response is
 * edge-cached for ten and is identical for every viewer — see the note at the
 * top of `app/api/world/route.ts` — so this costs a cache hit, not a query.
 */

const POLL_MS = 15_000;

export interface World {
  points: WorldPoint[];
  /** Candles this hour that could be placed. Null when unavailable. */
  placed: number | null;
  /** False until the first response, so the page can hold its caption back. */
  loaded: boolean;
}

export function useWorld(): World {
  const [world, setWorld] = useState<World>({
    points: [],
    placed: null,
    loaded: false,
  });

  useEffect(() => {
    let stopped = false;
    let timer: number | undefined;

    const poll = async () => {
      try {
        const res = await fetch('/api/world');
        if (!res.ok) return;
        const body = (await res.json()) as {
          points?: WorldPoint[];
          placed?: number | null;
        };
        if (stopped) return;
        setWorld({
          points: Array.isArray(body.points) ? body.points : [],
          placed: typeof body.placed === 'number' ? body.placed : null,
          loaded: true,
        });
      } catch {
        // Leave the last earth on screen. An unreachable endpoint means the
        // lights stop changing, not that the world empties — and this page
        // shows no errors, like every other page here.
        if (!stopped) setWorld((w) => ({ ...w, loaded: true }));
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

  return world;
}
