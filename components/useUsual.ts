'use client';

import { useCallback, useState } from 'react';
import { usualFingerprint } from '@/lib/journey';
import type { UserPreferences } from '@/lib/types';

const USUAL_KEY = 'mwm.usual';

interface Usual {
  enabled: boolean;
  fingerprint: string;
}

const OFF: Usual = { enabled: false, fingerprint: '' };

function readUsual(): Usual {
  try {
    const v = JSON.parse(localStorage.getItem(USUAL_KEY) ?? 'null') as
      | Partial<Usual>
      | null;
    if (!v || typeof v !== 'object') return OFF;
    return {
      enabled: v.enabled === true,
      fingerprint: typeof v.fingerprint === 'string' ? v.fingerprint : '',
    };
  } catch {
    return OFF;
  }
}

/**
 * "Skip the questions and use these."
 *
 * The switch remembers the preferences it was turned on with, and the skip
 * is honoured only while they are still the preferences: change the length
 * on the rail, or let another device's copy arrive, and the questions come
 * back until it is switched on again. A change made in the settings drawer
 * on Home carries the switch with it (`forPrefs` below). That is what "when nothing changed"
 * means, and it is why the fingerprint is stored beside the flag rather than
 * the flag alone.
 *
 * THE SWITCH TURNS ITSELF ON ONCE
 * A first-timer has no usual to skip to; after the first sitting completes
 * they do, so `afterFirstSitting` turns the skip on with the preferences it
 * was just sat with — only if `mwm.usual` has never been written. Off is a
 * choice and is remembered: a stored `false` is never flipped back.
 *
 * Whether this device has sat before is not read here: the practice log is
 * the one record of that (`Journey`'s `hasSat`). Until 22 September 2026 a
 * second key, `mwm.flow`, was written on the first strike for the same
 * question; it is no longer read, and a stale one is harmless.
 */
export function useUsual(prefs: UserPreferences) {
  const [stored, setStored] = useState<Usual>(() =>
    typeof window === 'undefined' ? OFF : readUsual(),
  );
  const usual = stored.enabled && stored.fingerprint === usualFingerprint(prefs);

  // `forPrefs`: the settings drawer changes a setting and keeps the skip on
  // in one gesture, so it fingerprints the preferences being written rather
  // than the ones this render was given.
  const setUsual = useCallback(
    (enabled: boolean, forPrefs: UserPreferences = prefs) => {
      const next = { enabled, fingerprint: usualFingerprint(forPrefs) };
      try {
        localStorage.setItem(USUAL_KEY, JSON.stringify(next));
      } catch {
        // Private mode.
      }
      setStored(next);
    },
    [prefs],
  );

  const afterFirstSitting = useCallback(() => {
    try {
      if (localStorage.getItem(USUAL_KEY) !== null) return;
    } catch {
      return;
    }
    setUsual(true);
  }, [setUsual]);

  return { usual, setUsual, afterFirstSitting };
}
