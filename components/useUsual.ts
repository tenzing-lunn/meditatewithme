'use client';

import { useCallback, useState } from 'react';
import { usualFingerprint } from '@/lib/journey';
import type { UserPreferences } from '@/lib/types';

const USUAL_KEY = 'mwm.usual';
const FLOW_KEY = 'mwm.flow';

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

function readAnswered(): boolean {
  try {
    const v = JSON.parse(localStorage.getItem(FLOW_KEY) ?? 'null') as
      | { answeredAt?: unknown }
      | null;
    return typeof v?.answeredAt === 'number';
  } catch {
    return false;
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
 * `answered` is whether this device has struck the bowl before, which is
 * what decides whether a guest is asked their name and origin.
 */
export function useUsual(prefs: UserPreferences) {
  const [stored, setStored] = useState<Usual>(() =>
    typeof window === 'undefined' ? OFF : readUsual(),
  );
  const [answered, setAnswered] = useState(() =>
    typeof window === 'undefined' ? false : readAnswered(),
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

  const markAnswered = useCallback(() => {
    try {
      localStorage.setItem(FLOW_KEY, JSON.stringify({ answeredAt: Date.now() }));
    } catch {
      // Private mode.
    }
    setAnswered(true);
  }, []);

  return { usual, setUsual, answered, markAnswered };
}
