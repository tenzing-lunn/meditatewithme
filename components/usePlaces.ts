'use client';

import { useEffect, useState } from 'react';
import { buildIndex, parsePlaces, type PlaceIndex } from '@/lib/places';
import { regionName } from './useOrigin';

/** One fetch per page, shared by every screen that asks. */
let pending: Promise<PlaceIndex | null> | null = null;

async function load(): Promise<PlaceIndex | null> {
  try {
    const res = await fetch('/places.txt');
    if (!res.ok) return null;
    return buildIndex(parsePlaces(await res.text()), regionName);
  } catch {
    return null;
  }
}

/**
 * The places the origin question searches.
 *
 * About 230KB over the wire, so it is fetched the first time the question
 * is on screen and not before: somebody signed in, who is never asked, never
 * downloads it. The search then runs here, in the browser, so the letters a
 * person types are not sent anywhere. A failed fetch is retried on the next
 * arrival; until then the question still takes whatever is typed.
 *
 * `loading` is true from the first arrival until the list is here or the
 * fetch has failed, so the question can say it is looking rather than offer
 * only "keep it as typed" for the seconds the list takes to arrive.
 */
export function usePlaces(want: boolean): { index: PlaceIndex | null; loading: boolean } {
  const [index, setIndex] = useState<PlaceIndex | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!want) return;
    let live = true;
    setFailed(false);
    pending ??= load().then((i) => {
      if (!i) pending = null;
      return i;
    });
    void pending.then((i) => {
      if (!live) return;
      if (i) setIndex(i);
      else setFailed(true);
    });
    return () => {
      live = false;
    };
  }, [want]);

  return { index, loading: want && index === null && !failed };
}
