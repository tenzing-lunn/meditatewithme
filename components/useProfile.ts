'use client';

import { useCallback, useState } from 'react';
import { EMPTY_PROFILE, normalizeProfile, type Profile } from '@/lib/label';

const KEY = 'mwm.profile';

function read(): Profile {
  try {
    return normalizeProfile(JSON.parse(localStorage.getItem(KEY) ?? 'null'));
  } catch {
    return EMPTY_PROFILE;
  }
}

/**
 * Who they said they are: a name, where they are from, and whether others
 * may see it. On this device, in `mwm.profile`.
 *
 * Read synchronously in the initialiser rather than in an effect. The
 * screens that use this are only ever mounted after `Entry` has resolved
 * the account and the preferences, which is after hydration, so there is no
 * server render to disagree with and no frame where the answers are blank.
 */
export function useProfile() {
  const [profile, setState] = useState<Profile>(() =>
    typeof window === 'undefined' ? EMPTY_PROFILE : read(),
  );

  const setProfile = useCallback((patch: Partial<Profile>) => {
    setState((p) => {
      const next = normalizeProfile({ ...p, ...patch });
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        // Private mode. The answers last the visit and that is fine.
      }
      return next;
    });
  }, []);

  return { profile, setProfile };
}
