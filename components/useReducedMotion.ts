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
 * same query on its own for anything CSS drives (`--rail-ms` and friends in
 * `globals.css`); this is for the moves that are decided in JS — the bowl's
 * strike, the camera lift, the earth's breathing — so they can be decided
 * the same way in one place.
 */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, read, readServer);
}
