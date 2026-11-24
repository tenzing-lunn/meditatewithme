// Who is on camera: the site's `components/useLive.ts`, asked of the site's
// own `/api/live`, and the arrival's line about it, as `Journey` words it.
//
// Every ten seconds while `on`. `live` is the stream to show; `next` is set
// between sessions (someone goes on at the top of the hour), as ms. A
// stream that disappears is held for twenty seconds before `live` lets go,
// so a guide's connection blipping never flashes the pond in; a failed
// poll changes nothing — it is not "nobody is live". `stopped` is an admin
// having shut a stream off in the last fifteen minutes, and lets go at once.
import { useEffect, useState } from 'react';
import { localTime } from '../lib/format';
import { SITE } from './auth';

/** `name` only when the guide chose to be named. */
export type OnCamera = { slug: string; hls: string; name?: string };

export interface Live {
  live: OnCamera | null;
  next: number | null;
  stopped: boolean;
}

const POLL_MS = 10_000;
const HOLD_MS = 20_000;

export function useLive(on: boolean): Live {
  const [live, setLive] = useState<OnCamera | null>(null);
  const [next, setNext] = useState<number | null>(null);
  const [stopped, setStopped] = useState(false);

  useEffect(() => {
    if (!on) {
      setLive(null);
      setNext(null);
      setStopped(false);
      return;
    }
    let stop = false;
    let seenAt = 0;
    const poll = async () => {
      try {
        const res = await fetch(`${SITE}api/live`, { cache: 'no-store' });
        const body = (await res.json()) as { live: OnCamera | null; next?: string; stopped?: boolean };
        if (stop) return;
        setStopped(body.stopped === true);
        if (body.live) {
          seenAt = Date.now();
          setLive((prev) => (prev?.hls === body.live!.hls && prev.name === body.live!.name ? prev : body.live));
          setNext(null);
        } else {
          if (body.stopped || Date.now() - seenAt >= HOLD_MS) setLive(null);
          setNext(body.next ? Date.parse(body.next) : null);
        }
      } catch {
        // Keep what is showing.
      }
    };
    void poll();
    const id = setInterval(() => void poll(), POLL_MS);
    return () => {
      stop = true;
      clearInterval(id);
    };
  }, [on]);

  return { live, next, stopped };
}

/** The line under the arrival's sentence when *with a guide* is chosen. */
export function guideLine({ live, next, stopped }: Live): string {
  if (live) return live.name ? `Live now with ${live.name}` : 'Live now';
  if (stopped) return 'This session was stopped. It will be back soon';
  if (next !== null) return `The next session starts at ${localTime(next)}`;
  return 'Nobody is guiding right now';
}
