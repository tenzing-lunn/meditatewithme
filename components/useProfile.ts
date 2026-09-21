'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { EMPTY_PROFILE, normalizeProfile, type Profile } from '@/lib/label';
import { browserClient } from '@/lib/supabase';

const KEY = 'mwm.profile';
const PUSH_DEBOUNCE_MS = 800;

function read(): Profile {
  try {
    return normalizeProfile(JSON.parse(localStorage.getItem(KEY) ?? 'null'));
  } catch {
    return EMPTY_PROFILE;
  }
}

/**
 * Who they said they are: a name, where they are from, and whether others
 * may see it.
 *
 * On this device in `mwm.profile` for everybody. Signed in, the name is the
 * account's (`user_metadata.name`, handed in as `name`) and the origin and
 * the switch live in `profiles` too, so they follow between devices: pulled
 * once per sign-in with the server winning, pushed on change. Shaped like
 * `useSyncPreferences`, for the same reasons.
 *
 * Read synchronously in the initialiser rather than in an effect. The
 * screens that use this are only ever mounted after `Entry` has resolved
 * the account and the preferences, which is after hydration, so there is no
 * server render to disagree with and no frame where the answers are blank.
 */
export function useProfile({
  userId,
  name,
}: {
  userId: string | null;
  /** The account's name, when there is one. Overrides the local answer. */
  name?: string;
}) {
  const [local, setLocal] = useState<Profile>(() =>
    typeof window === 'undefined' ? EMPTY_PROFILE : read(),
  );

  // What the server is known to hold, so a pull does not push itself back.
  const remote = useRef<Pick<Profile, 'origin' | 'share'> | null>(null);

  const setProfile = useCallback((patch: Partial<Profile>) => {
    setLocal((p) => {
      const next = normalizeProfile({ ...p, ...patch });
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        // Private mode. The answers last the visit and that is fine.
      }
      return next;
    });
  }, []);

  // ---- Pull, once per sign-in -------------------------------------------
  useEffect(() => {
    if (!userId) {
      remote.current = null;
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await browserClient()
          .from('profiles')
          .select('origin, share_label')
          .eq('id', userId)
          .maybeSingle();
        if (error) throw error;
        if (cancelled || !data) return;
        const row = data as { origin: string | null; share_label: boolean | null };
        const server = normalizeProfile({ origin: row.origin, share: row.share_label });
        if (server.origin !== null || server.share !== null) {
          remote.current = { origin: server.origin, share: server.share };
          setProfile({ origin: server.origin, share: server.share });
        } else {
          // Nothing on the server yet: what this device knows is pushed by
          // the effect below, once, because `remote` now differs from it.
          remote.current = { origin: null, share: null };
        }
      } catch {
        // The local copy stands. A failed pull is not worth interrupting for.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, setProfile]);

  // ---- Push, debounced, on change ---------------------------------------
  useEffect(() => {
    if (!userId || remote.current === null) return;
    if (remote.current.origin === local.origin && remote.current.share === local.share) return;
    const timer = window.setTimeout(async () => {
      try {
        const { error } = await browserClient()
          .from('profiles')
          .upsert(
            { id: userId, origin: local.origin, share_label: local.share },
            { onConflict: 'id' },
          );
        if (error) throw error;
        remote.current = { origin: local.origin, share: local.share };
      } catch {
        // localStorage already has it.
      }
    }, PUSH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [userId, local.origin, local.share]);

  const profile: Profile = name ? { ...local, name } : local;
  return { profile, setProfile };
}
