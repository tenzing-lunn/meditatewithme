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
/**
 * UNLOCKING IS NOT PLAYING
 *
 * These were the same act until 7 September 2026, and that was the one thing
 * `VISION.md` says v1 must not become: *"Something that plays sound at you.
 * The only sound you did not ask for is the bell you chose."*
 *
 * Pressing `Let’s begin.` called `ensure()`, which built the graph at the
 * stored levels. So a returning visitor with rain at 0.6 heard rain the
 * instant they pressed the word — two screens before being asked whether they
 * wanted any background noise, with no indicator and no control on screen to
 * stop it. The tell that this had stopped being a decision was that it had to
 * be written into `CLAUDE.md` as a hazard to our own developers: *"there is no
 * silent path through the setup flow."*
 *
 * The autoplay reason for building early is real and unchanged — a context can
 * only start inside a gesture, and the five chips in the Sound row are far too
 * late to be the first one. So the graph is still built on the first press,
 * but silent: `ensure({ silent: true })` starts the master at zero and
 * `unmute()` raises it when the Sound row is actually opened.
 *
 * Since 14 September 2026 the gestures are the rail's. A door on a guest's
 * first screen, and a door on the signed-in home, call `ensure({ silent:
 * true })`; the Sound screen's switch calls `unmute()` when it is turned on;
 * and the bowl strike builds the graph audibly through `begin` — `ensure()`
 * then `restore()` — which is the case this note describes as allowed: the
 * mix is the one the person built for the sitting they are starting, and the
 * line under the bowl says what it is.
 *
 * The beds' own levels are left alone throughout, which is what makes this
 * safe rather than clever: saying *No* to the question writes real zeros to
 * preferences, so raising the master on a declined mix plays nothing at all.
 * The master is about *when*, never about *whether*.
 */
export interface Mix {
  /**
   * Build the graph if it does not exist yet. MUST be called from inside a
   * user gesture. Safe to call repeatedly.
   *
   * `silent` builds it with the master at zero — audible only once `unmute`,
   * `restore`, or a deliberate move of the master fader raises it.
   */
  ensure: (opts?: { silent?: boolean }) => void;
  /**
   * Raise the master to the stored level, once there is a reason to. A no-op
   * on a graph that was never built silent.
   */
  unmute: () => void;
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

  /**
   * The graph exists but the master is being held at zero.
   *
   * A ref rather than state because the effect below reads it while pushing
   * preferences into the graph, and that effect must not re-run when this
   * changes — every path that clears the flag also sets the gain itself.
   */
  const muted = useRef(false);

  const ensure = useCallback((opts?: { silent?: boolean }) => {
    if (!handle.current) {
      muted.current = opts?.silent === true;
      handle.current = startMix(
        muted.current ? { ...latest.current, [MASTER_KEY]: 0 } : latest.current,
      );
    } else {
      // Already running: this is also the iOS resume path, since unlockAudio
      // resumes a suspended context.
      unlockAudio();
    }
  }, []);

  const unmute = useCallback(() => {
    if (!muted.current) return;
    muted.current = false;
    handle.current?.set(MASTER_KEY, latest.current[MASTER_KEY] ?? DEFAULT_MASTER);
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
    // The beds always take their stored levels; only the master is withheld.
    // Without this branch, any change to the mix — a fader dragged, a sync
    // arriving from another device — would push the stored master in and
    // undo the silence by a side door.
    mix.set(
      MASTER_KEY,
      muted.current ? 0 : (soundMix[MASTER_KEY] ?? DEFAULT_MASTER),
    );
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

  // Clears the hold too. A sitting has started: the question has been asked
  // and answered, and whatever the beds are set to is now what was asked for.
  const restore = useCallback(() => {
    muted.current = false;
    handle.current?.restore(latest.current[MASTER_KEY] ?? DEFAULT_MASTER);
  }, []);

  return { ensure, unmute, fadeOut, restore };
}
