'use client';

import { useEffect, useState } from 'react';

/**
 * Who is on camera, while `on` — a sitting with others.
 *
 * Asks `/api/live` every ten seconds. `live` is the stream to show;
 * `next` is set between sessions (someone is waiting to go on at the top
 * of the hour), as ms.
 *
 * A collaborator whose connection blips is off the air for a few seconds
 * as far as the server knows, so a stream that disappears is held for
 * HOLD_MS before `live` lets go of it: a blip never flashes the pond in.
 * A failed poll changes nothing — it is not "nobody is live".
 */

/** `name` only when the guide chose to be named. */
export type OnCamera = { slug: string; hls: string; name?: string };

const POLL_MS = 10_000;
const HOLD_MS = 20_000;

export function useLive(on: boolean): { live: OnCamera | null; next: number | null } {
  const [live, setLive] = useState<OnCamera | null>(null);
  const [next, setNext] = useState<number | null>(null);

  useEffect(() => {
    if (!on) {
      setLive(null);
      setNext(null);
      return;
    }
    let stop = false;
    let seenAt = 0;
    const poll = async () => {
      try {
        const res = await fetch('/api/live', { cache: 'no-store' });
        const body = (await res.json()) as { live: OnCamera | null; next?: string };
        if (stop) return;
        if (body.live) {
          seenAt = Date.now();
          setLive((prev) =>
            prev?.hls === body.live!.hls && prev.name === body.live!.name ? prev : body.live,
          );
          setNext(null);
        } else {
          if (Date.now() - seenAt >= HOLD_MS) setLive(null);
          setNext(body.next ? Date.parse(body.next) : null);
        }
      } catch {
        // Keep what is showing.
      }
    };
    void poll();
    const id = window.setInterval(poll, POLL_MS);
    return () => {
      stop = true;
      window.clearInterval(id);
    };
  }, [on]);

  return { live, next };
}
