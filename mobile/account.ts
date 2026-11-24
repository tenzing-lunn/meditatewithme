// The account, native: the session the app now holds (`supabase.ts`), and
// the three things the site syncs to it — the preferences, the profile, the
// practice log — synced from here the way the site's hooks sync them
// (`useSyncPreferences`, `useProfile`, `usePractice`), with the same pure
// helpers from `lib/`. A guest keeps all three on the phone; signing in
// pulls the account's copy and pushes what the phone has that it lacks.
//
// The rules are the site's: preferences and the profile, the server wins
// when it has a value and the phone's fills it when it has none; the
// practice log is a union by id, never a replacement. Signing out is local
// (this phone only) and keeps the phone's copies, as the site's does.
import type { Session, User } from '@supabase/supabase-js';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { EMPTY_PROFILE, composeLabel, normalizeProfile, type Profile } from '../lib/label';
import { MIN_LOGGED_SECONDS, mergeEntries, normaliseEntries, parseEntries, type PracticeEntry } from '../lib/practice';
import { fromRow, samePreferences, toRow, type PreferencesRow } from '../lib/preferences';
import type { UserPreferences } from '../lib/types';
import { SITE } from './auth';
import { supabase } from './supabase';

const PRACTICE_KEY = 'mwm.app.practice';
const PROFILE_KEY = 'mwm.app.profile';
/** Before 24 November 2026, sittings waiting to be handed to the site's log. Folded in once. */
const UNSENT_KEY = 'mwm.app.unsent';

/** The name the account was given, if any (the site's `displayName`). */
export function displayName(user: User): string | undefined {
  const name = user.user_metadata?.name;
  if (typeof name !== 'string') return undefined;
  const trimmed = name.trim();
  return trimmed === '' ? undefined : trimmed;
}

/** The corner's word, as the site's corner says it (`cornerWord`). */
export function cornerWord(user: User): string {
  return displayName(user)?.split(/\s+/)[0] ?? user.email?.split('@')[0] ?? 'Account';
}

function readJson(key: string): unknown {
  try {
    return JSON.parse(localStorage.getItem(key) ?? 'null');
  } catch {
    return null;
  }
}

function readLog(): PracticeEntry[] {
  const log = parseEntries(readJson(PRACTICE_KEY));
  // The old queue's shape: seconds rather than minutes.
  const old = readJson(UNSENT_KEY);
  if (!Array.isArray(old) || !old.length) return log;
  const folded = old.flatMap((e: { id?: unknown; startedAt?: unknown; seconds?: unknown; completed?: unknown }) =>
    typeof e?.id === 'string' && typeof e.startedAt === 'number' && typeof e.seconds === 'number'
      ? [{ id: e.id, startedAt: e.startedAt, minutes: Math.max(1, Math.round(e.seconds / 60)), completed: e.completed === true }]
      : [],
  );
  const merged = normaliseEntries(mergeEntries(log, folded));
  localStorage.setItem(PRACTICE_KEY, JSON.stringify(merged));
  localStorage.removeItem(UNSENT_KEY);
  return merged;
}

interface SittingRow {
  id: string;
  user_id: string;
  started_at: string;
  minutes: number;
  completed: boolean;
}

const sittingRow = (userId: string, e: PracticeEntry): SittingRow => ({
  id: e.id,
  user_id: userId,
  started_at: new Date(e.startedAt).toISOString(),
  minutes: e.minutes,
  completed: e.completed,
});

/** One of the site's account routes, with the session's token: the reply, or null when it could not be reached. */
export async function siteApi<T>(path: string, method: string, body?: unknown): Promise<{ status: number; body: T } | null> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  try {
    const res = await fetch(`${SITE}api/${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return { status: res.status, body: (await res.json().catch(() => ({}))) as T };
  } catch {
    return null;
  }
}

export interface Account {
  /** Undefined until the stored session has been read. */
  session: Session | null | undefined;
  user: User | null;
  /** The name the person goes by: the account's when signed in, else the phone's. */
  name: string | null;
  profile: Profile;
  /** "Ana from Lisbon", only if they chose to be seen. */
  label: string | null;
  entries: PracticeEntry[];
  record: (entry: { id: string; startedAt: number; seconds: number; completed: boolean }) => void;
  saveName: (name: string | null) => Promise<string | null>;
  saveProfile: (patch: Partial<Profile>) => Promise<string | null>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<string | null>;
  /** The account's place and switch read again, after the sign-in's questions wrote them. */
  refreshProfile: () => Promise<void>;
}

export function useAccount(prefs: UserPreferences, replacePrefs: (p: UserPreferences) => void): Account {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [profile, setProfile] = useState<Profile>(() => normalizeProfile(readJson(PROFILE_KEY)));
  const [entries, setEntries] = useState<PracticeEntry[]>(readLog);
  const user = session?.user ?? null;
  const userId = user?.id ?? null;

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  const keepProfile = (next: Profile) => {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(next));
    setProfile(next);
  };
  const profileRef = useRef(profile);
  profileRef.current = profile;

  // ---- preferences: pulled once per sign-in, then pushed as they change ----
  const remotePrefs = useRef<UserPreferences | null>(null);
  const pulledFor = useRef<string | null>(null);
  const prefsRef = useRef(prefs);
  prefsRef.current = prefs;

  // ---- the practice log: ids the account already has --------------------
  const pushed = useRef(new Set<string>());

  const syncLog = async (id: string) => {
    const { data, error } = await supabase
      .from('sittings')
      .select('id, user_id, started_at, minutes, completed')
      .order('started_at', { ascending: false })
      .limit(1000);
    if (error) return;
    const remote = (data as SittingRow[]).map((r) => ({ id: r.id, startedAt: Date.parse(r.started_at), minutes: r.minutes, completed: r.completed }));
    remote.forEach((e) => pushed.current.add(e.id));
    const merged = normaliseEntries(mergeEntries(readLog(), remote));
    localStorage.setItem(PRACTICE_KEY, JSON.stringify(merged));
    setEntries(merged);
    await pushMissing(id, merged);
  };

  const pushMissing = async (id: string, log: PracticeEntry[]) => {
    const missing = log.filter((e) => !pushed.current.has(e.id));
    if (!missing.length) return;
    const { error } = await supabase.from('sittings').upsert(missing.map((e) => sittingRow(id, e)), { onConflict: 'id', ignoreDuplicates: true });
    if (!error) missing.forEach((e) => pushed.current.add(e.id));
  };

  // On a sign-in: each of the three pulled, the phone's filling what the account lacks.
  useEffect(() => {
    pushed.current = new Set();
    remotePrefs.current = null;
    pulledFor.current = null;
    if (!userId) return;
    let gone = false;
    void (async () => {
      const [{ data: row }, { data: prof }] = await Promise.all([
        supabase.from('preferences').select('*').eq('user_id', userId).maybeSingle(),
        supabase.from('profiles').select('origin, share_label').eq('id', userId).maybeSingle(),
      ]);
      if (gone) return;
      if (row) {
        const theirs = fromRow(row as PreferencesRow);
        remotePrefs.current = theirs;
        replacePrefs(theirs);
      } else {
        const { error } = await supabase.from('preferences').upsert(toRow(userId, prefsRef.current), { onConflict: 'user_id' });
        if (!error) remotePrefs.current = prefsRef.current;
      }
      const p = prof as { origin: string | null; share_label: boolean | null } | null;
      if (p && (p.origin !== null || p.share_label !== null)) {
        keepProfile({ ...profileRef.current, origin: p.origin, share: p.share_label });
      } else if (profileRef.current.origin !== null || profileRef.current.share !== null) {
        await supabase.from('profiles').upsert({ id: userId, origin: profileRef.current.origin, share_label: profileRef.current.share }, { onConflict: 'id' });
      }
      pulledFor.current = userId;
      await syncLog(userId);
    })();
    return () => {
      gone = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // A preference changed: to the account, a moment later, unless it already has it.
  useEffect(() => {
    if (!userId || pulledFor.current !== userId) return;
    if (remotePrefs.current && samePreferences(remotePrefs.current, prefs)) return;
    const t = setTimeout(() => {
      void supabase.from('preferences').upsert(toRow(userId, prefs), { onConflict: 'user_id' }).then(({ error }) => {
        if (!error) remotePrefs.current = prefs;
      });
    }, 900);
    return () => clearTimeout(t);
  }, [prefs, userId]);

  // Back in front: whatever the log has that the account lacks.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && userId && pulledFor.current === userId) void pushMissing(userId, readLog());
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const record: Account['record'] = (e) => {
    // Under a minute was a mis-tap, not a sitting.
    if (e.seconds < MIN_LOGGED_SECONDS) return;
    const entry: PracticeEntry = { id: e.id, startedAt: e.startedAt, minutes: Math.max(1, Math.round(e.seconds / 60)), completed: e.completed };
    const next = normaliseEntries([entry, ...readLog()]);
    localStorage.setItem(PRACTICE_KEY, JSON.stringify(next));
    setEntries(next);
    if (userId && pulledFor.current === userId) void pushMissing(userId, next);
  };

  const saveName = async (raw: string | null) => {
    const name = raw?.trim() || null;
    if (userId) {
      const { error } = await supabase.auth.updateUser({ data: { name } });
      if (error) return 'The name could not be saved just now. Please try again.';
    }
    keepProfile({ ...profileRef.current, name });
    return null;
  };

  const saveProfile = async (patch: Partial<Profile>) => {
    const next = { ...profileRef.current, ...patch };
    if (userId) {
      const { error } = await supabase.from('profiles').upsert({ id: userId, origin: next.origin, share_label: next.share }, { onConflict: 'id' });
      if (error) return 'That could not be saved just now. Please try again.';
    }
    keepProfile(next);
    return null;
  };

  const signOut = async () => {
    // This phone only, as the site's: a sign-out here is not a sign-out everywhere.
    await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
  };

  const deleteAccount = async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) return 'You are no longer signed in, so there is nothing here to delete.';
    const reply = await siteApi<{ ok?: boolean }>('account', 'DELETE');
    if (!reply) return 'Could not reach the server. Nothing has been changed — please try again.';
    if (reply.status === 401) return 'That session has expired. Sign in again and you can delete the account from here.';
    if (!reply.body.ok) return 'The account could not be deleted just now. Nothing has been changed — please try again.';
    await signOut();
    return null;
  };

  const refreshProfile = async () => {
    const { data } = await supabase.auth.getSession();
    const id = data.session?.user.id;
    if (!id) return;
    const { data: p } = await supabase.from('profiles').select('origin, share_label').eq('id', id).maybeSingle();
    const row = p as { origin: string | null; share_label: boolean | null } | null;
    if (row) keepProfile({ ...profileRef.current, origin: row.origin, share: row.share_label });
  };

  const name = (user ? displayName(user) : profile.name) ?? null;
  const label = useMemo(() => (profile.share ? composeLabel(name, profile.origin) : null), [profile, name]);

  return {
    session,
    user,
    name,
    profile: profile ?? EMPTY_PROFILE,
    label,
    entries,
    record,
    saveName,
    saveProfile,
    signOut,
    deleteAccount,
    refreshProfile,
  };
}
