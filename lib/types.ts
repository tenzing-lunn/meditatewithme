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
 * Where we are inside the hour.
 *
 * 'active'   — minutes 0-45, the session is running
 * 'interlude' — minutes 45-60, waiting for the next one
 */
export type SessionPhase = 'active' | 'interlude';

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
export type BellKind = 'singing-bowl' | 'gong' | 'struck-bell';

export interface UserPreferences {
  timerMinutes: number;
  endBell: BellKind;
  focusSlug: string;
  /** track slug -> gain, 0..1 */
  soundMix: Record<string, number>;
  showCount: boolean;
}
