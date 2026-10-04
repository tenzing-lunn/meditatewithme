// Everyone sitting this hour, as fish for the pond: the site's `/api/world`
// (cells with live counts and the labels of people who chose to be seen),
// read the way the site reads it (`components/useWorld.ts`, `Journey`'s
// `stones`), every fifteen seconds. Reads and never writes: looking at the
// water is not sitting on it.
import { useEffect, useState } from 'react';
import { SITE } from './auth';
import type { Stone } from './Pond';

const POLL_MS = 15_000;
const MAX_STONES = 400;

interface WorldPoint {
  lat: number;
  lon: number;
  live: number;
  labels?: string[];
}

export function useStones(enabled: boolean): Stone[] {
  const [stones, setStones] = useState<Stone[]>([]);
  useEffect(() => {
    if (!enabled) return;
    let live = true;
    let misses = 0;
    const read = async () => {
      try {
        const res = await fetch(`${SITE}api/world`, { cache: 'no-store' });
        if (!res.ok) throw new Error();
        const body = (await res.json()) as { points?: WorldPoint[] };
        const out: Stone[] = [];
        for (const p of body.points ?? []) {
          for (let k = 0; k < p.live && out.length < MAX_STONES; k++) {
            out.push({ key: `${p.lat},${p.lon}#${k}`, label: p.labels?.[k], lat: p.lat, lon: p.lon });
          }
        }
        misses = 0;
        if (live) setStones(out);
      } catch {
        // One missed poll keeps the last water; two and the fish go.
        misses += 1;
        if (misses >= 2 && live) setStones([]);
      }
    };
    void read();
    const timer = setInterval(() => void read(), POLL_MS);
    return () => {
      live = false;
      clearInterval(timer);
    };
  }, [enabled]);
  return stones;
}
