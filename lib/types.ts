/**
 * Shared domain types.
 *
 * `SessionKind` is the seam that lets v2 add live video without touching
 * the scheduler. v1 only ever produces 'ambient'.
 */

export type SessionKind = 'ambient' | 'live';

/**
 * A session as the UI consumes it.
 *
 * Note the UI never asks "are we live?" — it asks the session what to render.
 * Adding live video means branching on `kind` in one component, nothing more.
 */
export interface Session {
  /** Exactly on the hour, UTC. Identifies the session globally. */
  hourStart: Date;
  kind: SessionKind;
  /** Which focus loop to show: 'candle' | 'water' | 'hourglass' */
  focusSlug: string;
  /** v2 only. Null in v1. */
  streamUrl: string | null;
  /** v2 only. Null in v1. */
  lighterId: string | null;
}

/**
 * The three closing bells from the proposal.
 *
 * A union rather than a string: the value round-trips through localStorage,
 * where anyone can edit it by hand, and it ends up selecting an audio buffer.
 * Naming the alternatives here means the compiler catches a bad one instead of
 * the audio graph failing silently at the end of somebody's sitting.
 *
 * Declared in lib/ so the dependency points the right way — components/audio.ts
 * imports this, not the reverse.
 */
export const BELL_KINDS = ['singing-bowl', 'gong', 'struck-bell'] as const;

export type BellKind = (typeof BELL_KINDS)[number];

export const DEFAULT_BELL: BellKind = 'singing-bowl';

/**
 * The guard lives with the type, not with the audio graph.
 *
 * Two things outside the browser need it now: preferences read back from
 * localStorage, and preferences synced down from the database. Neither should
 * have to import the Web Audio module to find out whether a string is a bell.
 *
 * The same three values are a CHECK constraint on `preferences.end_bell` in
 * supabase/migrations/0003_accounts.sql. Change one, change both.
 */
export function isBellKind(v: unknown): v is BellKind {
  return typeof v === 'string' && (BELL_KINDS as readonly string[]).includes(v);
}

/**
 * The five ambient beds.
 *
 * Declared here rather than in components/mix.ts for the same reason
 * BELL_KINDS is: the value round-trips through localStorage and through a
 * jsonb column, both of which anyone can edit by hand, and the things that need
 * to validate it — `normalize()` in lib/preferences.ts above all — should not
 * have to import the Web Audio module to find out whether a string is a track.
 *
 * The labels and the sound itself stay in components/mix.ts. This is the
 * vocabulary; that is the instrument.
 */
export const TRACK_SLUGS = ['rain', 'wind', 'waterfall', 'hum', 'night'] as const;

export type TrackSlug = (typeof TRACK_SLUGS)[number];

export function isTrackSlug(v: unknown): v is TrackSlug {
  return typeof v === 'string' && (TRACK_SLUGS as readonly string[]).includes(v);
}

/**
 * Master volume rides in the same record as the tracks, under a reserved key.
 *
 * The alternative was a sixth field on UserPreferences and a migration for one
 * number. `normalizeMix` already clamps every value in that record to 0..1,
 * which is exactly the guarantee a master gain needs, so it comes for free.
 *
 * The cost is that `soundMix` now has one key that is not a track, which is why
 * `isTrackSlug` deliberately returns false for it and why normalizeMix has to
 * allow it through by name.
 */
export const MASTER_KEY = 'master';

/** Loud enough to hear under a bell, quiet enough not to be the point. */
export const DEFAULT_MASTER = 0.7;

export interface UserPreferences {
  timerMinutes: number;
  endBell: BellKind;
  focusSlug: string;
  /** track slug -> gain, 0..1 */
  soundMix: Record<string, number>;
  showCount: boolean;
}
