'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';

import { unlockAudio } from './audio';
import {
  DEFAULT_MASTER,
  MASTER_KEY,
  TRACK_SLUGS,
  startMix,
  type MixHandle,
} from './mix';

/**
 * The ambient mix, wired to preferences.
 *
 * Browser-side by nature — an AudioContext, the visibility API, a graph that
 * outlives any single render — which is why it is here and not in lib/.
 *
 * WHO OWNS THE VALUES
 * `prefs.soundMix` does, exclusively. Nothing in this hook holds a level of its
 * own. A slider writes to preferences and the effect below pushes preferences
 * into the graph, so the same path serves a drag, a mix synced down from
 * another device, and a sign-in that replaces the whole set. Storing levels
 * here as well would mean two copies that eventually disagree, and the
 * disagreement would be silent.
 *
 * WHEN THE GRAPH IS BUILT
 * Lazily, on the first thing a user actually does — touching a slider or
 * pressing Begin. Autoplay policy will not let an AudioContext start any other
 * way, and an effect is not a gesture. `ensure()` therefore has to be called
 * synchronously from inside the event handler, not from a `useEffect` reacting
 * to it.
 */
export interface Mix {
  /**
   * Build the graph if it does not exist yet. MUST be called from inside a
   * user gesture. Safe to call repeatedly.
   */
  ensure: () => void;
  /** Take the mix down gently. Used once the bell has sounded — the caller
   *  sets how gently, because the ending is thirty seconds long. */
  fadeOut: (seconds?: number) => void;
  /** Bring it back for the next sitting. */
  restore: () => void;
}

export function useMix(soundMix: Record<string, number>): Mix {
  const handle = useRef<MixHandle | null>(null);

  // Read inside ensure(), which can fire long after the render that created
  // this closure — a stale mix there would build the graph with somebody's
  // levels from several changes ago.
  const latest = useRef(soundMix);
  latest.current = soundMix;

  const ensure = useCallback(() => {
    if (!handle.current) handle.current = startMix(latest.current);
    // Already running: this is also the iOS resume path, since unlockAudio
    // resumes a suspended context.
    else unlockAudio();
  }, []);

  // Depend on the values, not the object. Room re-renders four times a second
  // off the clock tick, and re-running the ramps on every one of those would
  // cancel each ramp a moment after scheduling it — the sliders would move and
  // nothing would fade.
  const fingerprint = useMemo(
    () =>
      [...TRACK_SLUGS, MASTER_KEY].map((k) => `${k}:${soundMix[k] ?? ''}`).join(),
    [soundMix],
  );

  useEffect(() => {
    const mix = handle.current;
    if (!mix) return;
    for (const slug of TRACK_SLUGS) mix.set(slug, soundMix[slug] ?? 0);
    mix.set(MASTER_KEY, soundMix[MASTER_KEY] ?? DEFAULT_MASTER);
    // soundMix is read through the fingerprint deliberately — see above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fingerprint]);

  // iOS suspends the context when the screen locks. Nothing can prevent that,
  // but coming back to a page whose sound never returns is worse than the gap
  // itself, so resume on the way back in.
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'visible' && handle.current) unlockAudio();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  useEffect(() => {
    return () => {
      handle.current?.stop();
      handle.current = null;
    };
  }, []);

  const fadeOut = useCallback(
    (seconds?: number) => handle.current?.fadeOut(seconds),
    [],
  );

  const restore = useCallback(
    () => handle.current?.restore(latest.current[MASTER_KEY] ?? DEFAULT_MASTER),
    [],
  );

  return { ensure, fadeOut, restore };
}
