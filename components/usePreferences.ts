'use client';

import { useCallback, useEffect, useState } from 'react';
import type { UserPreferences } from '@/lib/types';
import { TIMER_DEFAULT_MINUTES, clampMinutes } from '@/lib/timer';
import { DEFAULT_BELL, isBellKind } from './audio';
import { DEFAULT_FOCUS_SLUG } from '@/lib/session';

/**
 * Preferences, in localStorage.
 *
 * localStorage is PRIMARY and the database is a sync target, not the other way
 * round. That ordering is what keeps the account layer cuttable: a guest gets
 * the complete product, and signing in later becomes a matter of pushing what
 * is already here upward. Reversing it would make accounts load-bearing, and
 * accounts are the step most likely to overrun.
 *
 * Everything read back out is validated rather than trusted. This is a value a
 * user can edit by hand in devtools, and a bad `timerMinutes` would otherwise
 * reach the scheduler and set a bell somewhere absurd.
 */

const STORAGE_KEY = 'mwm.preferences';

export const DEFAULT_PREFERENCES: UserPreferences = {
  timerMinutes: TIMER_DEFAULT_MINUTES,
  endBell: DEFAULT_BELL,
  focusSlug: DEFAULT_FOCUS_SLUG,
  soundMix: {},
  showCount: true,
};

function parse(raw: string | null): UserPreferences {
  if (!raw) return DEFAULT_PREFERENCES;
  try {
    const v = JSON.parse(raw) as Partial<UserPreferences>;
    return {
      timerMinutes: clampMinutes(Number(v.timerMinutes)),
      endBell: isBellKind(v.endBell) ? v.endBell : DEFAULT_BELL,
      focusSlug:
        typeof v.focusSlug === 'string' ? v.focusSlug : DEFAULT_FOCUS_SLUG,
      soundMix:
        v.soundMix && typeof v.soundMix === 'object' ? v.soundMix : {},
      showCount: v.showCount !== false,
    };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export function usePreferences() {
  // Starts at defaults on both server and client, then loads in an effect.
  // Reading storage during render would produce a hydration mismatch, because
  // the server has no localStorage to read.
  const [prefs, setPrefs] = useState<UserPreferences>(DEFAULT_PREFERENCES);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      setPrefs(parse(window.localStorage.getItem(STORAGE_KEY)));
    } catch {
      // Private browsing can throw outright. Defaults are a fine outcome.
    }
    setLoaded(true);
  }, []);

  const update = useCallback((patch: Partial<UserPreferences>) => {
    setPrefs((current) => {
      const next = { ...current, ...patch };
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Preferences that don't persist are a much smaller problem than a
        // crash mid-session. Keep them in memory for this visit.
      }
      return next;
    });
  }, []);

  return { prefs, update, loaded };
}
