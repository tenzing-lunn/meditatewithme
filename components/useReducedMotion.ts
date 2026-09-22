'use client';

import { useSyncExternalStore } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';

function subscribe(onChange: () => void) {
  const mq = window.matchMedia(QUERY);
  mq.addEventListener('change', onChange);
  return () => mq.removeEventListener('change', onChange);
}

const read = () => window.matchMedia(QUERY).matches;
const readServer = () => false;

/**
 * Whether the visitor has asked for less motion. The stylesheet honours the
 * same query on its own for anything CSS drives, in the one block at the end
 * of `globals.css`; this is for the moves that are decided in JS — the
 * camera lift's hold, the typed prompt, the dial's spring, the candle, the
 * skip's arrival, and the earth's breath (`WorldMap` takes it as `reduced`
 * from whoever renders it) — so they are all decided by the one read.
 */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, read, readServer);
}
