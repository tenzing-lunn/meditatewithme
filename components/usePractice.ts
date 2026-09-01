'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  MIN_LOGGED_SECONDS,
  mergeEntries,
  normaliseEntries,
  parseEntries,
  type PracticeEntry,
} from '@/lib/practice';
import { browserClient } from '@/lib/supabase';

/**
 * Your practice log.
 *
 * localStorage primary, database as sync target — the same ordering as
 * preferences, and for the same reason. A guest gets their full history and
 * their streak without ever making an account; signing in is what carries it
 * between devices. Reversing that would mean the answer to "how consistent have
 * I been" required a login, which is a strange toll to put on the one screen
 * meant to encourage you.
 *
 * SYNCING IS A UNION, NOT A MERGE
 * A sitting is a fact that happened, so there is no conflict to resolve: a
 * sitting present on either side is kept. Ids are generated on the client and
 * are the primary key in Postgres, so pushing the same one twice collides and
 * does nothing rather than doubling a streak.
 */

const STORAGE_KEY = 'mwm.practice';

/** Crypto.randomUUID needs a secure context. Localhost and https both qualify,
 *  but a fallback is cheaper than a sitting that fails to record. */
function newId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }
}

interface SittingRow {
  id: string;
  user_id: string;
  started_at: string;
  minutes: number;
  completed: boolean;
}

const toRow = (userId: string, e: PracticeEntry): SittingRow => ({
  id: e.id,
  user_id: userId,
  started_at: new Date(e.startedAt).toISOString(),
  minutes: e.minutes,
  completed: e.completed,
});

const fromRow = (r: SittingRow): PracticeEntry => ({
  id: r.id,
  startedAt: Date.parse(r.started_at),
  minutes: r.minutes,
  completed: r.completed,
});

export function usePractice(userId: string | null) {
  const [entries, setEntries] = useState<PracticeEntry[]>([]);
  const [loaded, setLoaded] = useState(false);

  // Read inside callbacks that must not re-create themselves on every change.
  const entriesRef = useRef(entries);
  entriesRef.current = entries;

  const write = useCallback((next: PracticeEntry[]) => {
    const clean = normaliseEntries(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(clean));
    } catch {
      // Private browsing, or a full quota. Keep it in memory for this visit —
      // losing a streak is not worth throwing during a sitting.
    }
    setEntries(clean);
    return clean;
  }, []);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      setEntries(parseEntries(raw ? JSON.parse(raw) : []));
    } catch {
      // Corrupt or unreadable. An empty log is the honest fallback.
    }
    setLoaded(true);
  }, []);

  /**
   * Record a finished sitting.
   *
   * Returns the entry, or null if it was too short to count — tapping Begin and
   * immediately stopping is not a sitting, and logging it would make the streak
   * mean less than it should.
   */
  const record = useCallback(
    ({
      id,
      startedAt,
      seconds,
      completed,
    }: {
      id?: string;
      startedAt: number;
      seconds: number;
      completed: boolean;
    }): PracticeEntry | null => {
      if (seconds < MIN_LOGGED_SECONDS) return null;

      const entry: PracticeEntry = {
        // The caller passes the sitting's own id so that a double-fired effect
        // records the same sitting twice and de-duplicates to one.
        id: id ?? newId(),
        startedAt,
        minutes: Math.max(1, Math.round(seconds / 60)),
        completed,
      };

      write([entry, ...entriesRef.current]);
      return entry;
    },
    [write],
  );

  // ---- Sync, on sign-in and on change -----------------------------------
  const pushed = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!userId || !loaded) {
      pushed.current = new Set();
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const supabase = browserClient();

        // Pull first, so a device signing in for the first time gains the
        // history rather than only contributing to it.
        const { data, error } = await supabase
          .from('sittings')
          .select('id, user_id, started_at, minutes, completed')
          .order('started_at', { ascending: false })
          .limit(1000);

        if (error) throw error;
        if (cancelled) return;

        const server = (data as SittingRow[]).map(fromRow);
        const union = mergeEntries(entriesRef.current, server);

        const serverIds = new Set(server.map((e) => e.id));
        const missing = union.filter((e) => !serverIds.has(e.id));

        if (missing.length > 0) {
          const { error: upsertError } = await supabase
            .from('sittings')
            .upsert(
              missing.map((e) => toRow(userId, e)),
              { onConflict: 'id', ignoreDuplicates: true },
            );
          if (upsertError) throw upsertError;
        }

        if (cancelled) return;
        for (const e of union) pushed.current.add(e.id);
        write(union);
      } catch {
        // The log is intact locally. A failed sync means this device is ahead,
        // which is recoverable and not worth a message on a meditation page.
      }
    })();

    return () => {
      cancelled = true;
    };
    // Runs once per sign-in. New sittings are handled by the effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, loaded, write]);

  // Push anything recorded after the initial sync.
  useEffect(() => {
    if (!userId || !loaded) return;

    const unsent = entries.filter((e) => !pushed.current.has(e.id));
    if (unsent.length === 0) return;

    let cancelled = false;

    (async () => {
      try {
        const { error } = await browserClient()
          .from('sittings')
          .upsert(
            unsent.map((e) => toRow(userId, e)),
            { onConflict: 'id', ignoreDuplicates: true },
          );
        if (error) throw error;
        if (cancelled) return;
        for (const e of unsent) pushed.current.add(e.id);
      } catch {
        // Left out of `pushed`, so the next change retries it.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [entries, userId, loaded]);

  return { entries, record, loaded };
}
