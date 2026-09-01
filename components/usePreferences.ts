'use client';

import { useCallback, useEffect, useState } from 'react';
import type { UserPreferences } from '@/lib/types';
import {
  DEFAULT_PREFERENCES,
  normalize,
  parsePreferences,
} from '@/lib/preferences';

/**
 * Preferences, in localStorage.
 *
 * localStorage is PRIMARY and the database is a sync target, not the other way
 * round. That ordering is what keeps the account layer cuttable: a guest gets
 * the complete product, and signing in later becomes a matter of pushing what
 * is already here upward. Reversing it would make accounts load-bearing, and
 * accounts are the step most likely to overrun.
 *
 * Validation moved to lib/preferences.ts once the database became a second
 * source of these values — see the note there about why both paths have to go
 * through one normalizer.
 */

const STORAGE_KEY = 'mwm.preferences';

export { DEFAULT_PREFERENCES };

export function usePreferences() {
  // Starts at defaults on both server and client, then loads in an effect.
  // Reading storage during render would produce a hydration mismatch, because
  // the server has no localStorage to read.
  const [prefs, setPrefs] = useState<UserPreferences>(DEFAULT_PREFERENCES);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      setPrefs(parsePreferences(window.localStorage.getItem(STORAGE_KEY)));
    } catch {
      // Private browsing can throw outright. Defaults are a fine outcome.
    }
    setLoaded(true);
  }, []);

  const write = useCallback((next: UserPreferences) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Preferences that don't persist are a much smaller problem than a
      // crash mid-session. Keep them in memory for this visit.
    }
    return next;
  }, []);

  /** Change some fields. What the UI calls. */
  const update = useCallback(
    (patch: Partial<UserPreferences>) => {
      setPrefs((current) => write({ ...current, ...patch }));
    },
    [write],
  );

  /**
   * Replace everything at once. What a sync-down calls.
   *
   * Separate from `update` because it is a different act: `update` is the user
   * changing their mind, `replace` is another device's copy arriving. Passing a
   * whole object through `update` would work, but the distinction is worth
   * keeping visible at the call site — and this one normalizes, because its
   * input came off the network.
   */
  const replace = useCallback(
    (next: unknown) => {
      setPrefs(write(normalize(next)));
    },
    [write],
  );

  return { prefs, update, replace, loaded };
}
