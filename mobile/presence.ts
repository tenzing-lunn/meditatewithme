// Presence, on the phone: the site's `usePresence`. Tell the site we are
// here every thirty seconds, and read back how many others are, every
// fifteen. Everyone with the app in front of them counts, as everyone on the
// page does on the site; a phone that goes to the background stops beating
// and drops out of the count about ninety seconds later — unless a sitting
// is on, because a locked phone in a pocket is how people meditate, and the
// app is still running then for the sitting's sound.
//
// `label` is "Ana from Lisbon" while sitting with others and chosen to be
// seen, null otherwise; it rides on every beat and a change beats at once,
// so a name is on the water exactly as long as that.
//
// The app is the only one beating: the site, loaded behind the app, keeps
// its own heartbeat off when it is inside it (`components/usePresence.ts`,
// `beat`), so nobody counts twice.
import * as Crypto from 'expo-crypto';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { SITE } from './auth';

const HEARTBEAT_MS = 30_000;
const COUNT_POLL_MS = 15_000;
const ANON_KEY = 'mwm.anonId';

/** One id per install, kept with the app's other things. Losing it costs one extra row in an hourly table. */
function loadAnonId(): string {
  try {
    const existing = localStorage.getItem(ANON_KEY);
    if (existing) return existing;
    const id = Crypto.randomUUID();
    localStorage.setItem(ANON_KEY, id);
    return id;
  } catch {
    return Crypto.randomUUID();
  }
}

export interface Presence {
  /** People present now, you included. Null while unknown, or after two failed polls. */
  count: number | null;
  /** People who have lit this hour, including those who have left. */
  litCount: number | null;
  /** Record a Begin. */
  begin: () => Promise<number | null>;
}

export function usePresence({ label = null, sitting = false }: { label?: string | null; sitting?: boolean } = {}): Presence {
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
      const res = await fetch(`${SITE}api/heartbeat`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ anonId, began: true, label: labelRef.current }),
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
    let beatTimer: ReturnType<typeof setInterval> | undefined;
    let pollTimer: ReturnType<typeof setInterval> | undefined;
    let stopped = false;

    const beat = async () => {
      try {
        await fetch(`${SITE}api/heartbeat`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ anonId, label: labelRef.current }),
        });
      } catch {
        // A missed beat is thirty seconds uncounted. It never interrupts a sitting.
      }
    };

    // One missed poll keeps the last number; two in a row and it goes null,
    // so the company line says nothing rather than something old.
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
        const res = await fetch(`${SITE}api/count`);
        if (!res.ok) return missed();
        const body = (await res.json()) as { count: number | null; litCount: number | null };
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
      beatTimer = setInterval(() => void beat(), HEARTBEAT_MS);
      pollTimer = setInterval(() => void poll(), COUNT_POLL_MS);
    };
    const stop = () => {
      clearInterval(beatTimer);
      clearInterval(pollTimer);
      beatTimer = undefined;
      pollTimer = undefined;
    };
    stopRef.current = stop;

    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        // Back in front: in the count at once, not up to thirty seconds later.
        if (beatTimer === undefined) start();
      } else if (state === 'background' && !sittingRef.current) {
        stop();
      }
    });
    if (AppState.currentState !== 'background') start();

    return () => {
      stopped = true;
      anonIdRef.current = null;
      beatRef.current = null;
      stopRef.current = null;
      stop();
      sub.remove();
    };
  }, []);

  // A label arriving or leaving is worth a beat of its own.
  useEffect(() => {
    void beatRef.current?.();
  }, [label]);

  // A sitting that ends with the app in the background stops the beats then.
  useEffect(() => {
    if (!sitting && AppState.currentState === 'background') stopRef.current?.();
  }, [sitting]);

  return { count, litCount, begin };
}
