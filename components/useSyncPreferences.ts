'use client';

import { useEffect, useRef, useState } from 'react';
import type { UserPreferences } from '@/lib/types';
import {
  fromRow,
  samePreferences,
  toRow,
  type PreferencesRow,
} from '@/lib/preferences';
import { browserClient } from '@/lib/supabase';

/**
 * Keep a signed-in user's preferences on the server.
 *
 * A SEPARATE HOOK, NOT A FEATURE OF usePreferences
 * Deleting this file and its one call site removes accounts entirely and
 * changes nothing else. That is the whole point of localStorage being primary,
 * and it stays true only if the sync never becomes a step the local path has to
 * go through.
 *
 * THE RULE ON FIRST SIGN-IN
 * The server wins if it has anything, otherwise local is pushed up. Which is
 * the build spec's "on first login, push whatever's in localStorage up", plus
 * the case it doesn't mention: signing in on a second device, where local is
 * just whatever that browser happened to default to and the server holds the
 * settings you actually chose. Taking local there would mean signing in on your
 * phone quietly overwrote your real preferences with defaults.
 *
 * The cost is that changes made as a guest on a device you later sign in on are
 * discarded. That is the right way round — losing an unsaved guest tweak is a
 * smaller harm than losing the settings you deliberately saved — but it is a
 * real trade, not a free one.
 */

/** Long enough that dragging the slider is one write, short enough to feel instant. */
const PUSH_DEBOUNCE_MS = 900;

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error';

export function useSyncPreferences({
  userId,
  prefs,
  replace,
  loaded,
}: {
  userId: string | null;
  prefs: UserPreferences;
  replace: (next: unknown) => void;
  loaded: boolean;
}): SyncStatus {
  const [status, setStatus] = useState<SyncStatus>('idle');

  // What the server is known to hold. Set by both the pull and the push, and
  // compared before every push — otherwise pulling a row sets state, which
  // looks like a change, which pushes the identical row straight back.
  const remote = useRef<UserPreferences | null>(null);

  // ---- Pull, once per sign-in -------------------------------------------
  useEffect(() => {
    if (!userId || !loaded) {
      remote.current = null;
      setStatus('idle');
      return;
    }

    let cancelled = false;
    setStatus('syncing');

    (async () => {
      try {
        const supabase = browserClient();

        const { data, error } = await supabase
          .from('preferences')
          .select('user_id, timer_minutes, until_bell, end_bell, focus_slug, sound_mix, show_count')
          .eq('user_id', userId)
          // maybeSingle: a first-time user having no row is the normal case,
          // and single() would call it an error.
          .maybeSingle();

        if (error) throw error;
        if (cancelled) return;

        if (data) {
          const server = fromRow(data as PreferencesRow);
          remote.current = server;
          replace(server);
        } else {
          // First sign-in anywhere. Push what this browser has.
          const { error: insertError } = await supabase
            .from('preferences')
            .insert(toRow(userId, prefs));
          if (insertError) throw insertError;
          if (cancelled) return;
          remote.current = prefs;
        }

        setStatus('synced');
      } catch {
        if (!cancelled) setStatus('error');
      }
    })();

    return () => {
      cancelled = true;
    };
    // Deliberately not keyed on `prefs`: this runs once per sign-in and reads
    // the current preferences at that moment. Re-running it on every change is
    // what the push effect below is for.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, loaded, replace]);

  // ---- Push, debounced, on change ---------------------------------------
  useEffect(() => {
    if (!userId || remote.current === null) return;
    if (samePreferences(remote.current, prefs)) return;

    const timer = window.setTimeout(async () => {
      try {
        setStatus('syncing');
        const { error } = await browserClient()
          .from('preferences')
          .upsert(toRow(userId, prefs), { onConflict: 'user_id' });
        if (error) throw error;
        remote.current = prefs;
        setStatus('synced');
      } catch {
        // localStorage already has it. A failed sync means this device is
        // correct and the others are stale, which is recoverable and not worth
        // interrupting a sitting over.
        setStatus('error');
      }
    }, PUSH_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [userId, prefs]);

  return status;
}
