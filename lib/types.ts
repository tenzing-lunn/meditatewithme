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

export interface UserPreferences {
  timerMinutes: number;
  endBell: BellKind;
  focusSlug: string;
  /** track slug -> gain, 0..1 */
  soundMix: Record<string, number>;
  showCount: boolean;
}
