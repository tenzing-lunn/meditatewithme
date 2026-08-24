/**
 * The scheduler.
 *
 * There is no cron job, no pre-generated rows, no job queue. A session exists
 * for every UTC hour whether or not a database row does. Rows in `sessions`
 * are OVERRIDES, not the schedule itself.
 *
 * Consequence: a missing row is not an error, it is the ambient default. That
 * is why the site can never be empty — being empty would require code we
 * haven't written.
 *
 * Everything here is a pure function of a timestamp. No I/O, no Date.now(),
 * no globals. Callers pass the time in, which is what makes this testable and
 * what lets us feed it a drift-corrected clock (see lib/clock.ts).
 */

import type { Session, SessionPhase } from './types';

export const HOUR_MS = 3_600_000;

/** Minutes of each hour the session runs. The rest is the interlude. */
export const SESSION_MINUTES = 45;
export const SESSION_MS = SESSION_MINUTES * 60_000;

export const DEFAULT_FOCUS_SLUG = 'candle';

/** Floor a timestamp to the top of its UTC hour. */
export function hourStart(atMs: number): Date {
  return new Date(Math.floor(atMs / HOUR_MS) * HOUR_MS);
}

/** The top of the next UTC hour. */
export function nextHourStart(atMs: number): Date {
  return new Date(hourStart(atMs).getTime() + HOUR_MS);
}

/** How far into the current hour we are, in ms. Always 0 <= x < HOUR_MS. */
export function msIntoHour(atMs: number): number {
  return atMs - hourStart(atMs).getTime();
}

/** Milliseconds until the next session begins. */
export function msUntilNextSession(atMs: number): number {
  return nextHourStart(atMs).getTime() - atMs;
}

/**
 * Are we inside the 45-minute session, or in the interlude before the next?
 *
 * The interlude is deliberate: it creates the anticipation the client's brief
 * describes, and it's where the "next session in N minutes" state lives.
 */
export function sessionPhase(atMs: number): SessionPhase {
  return msIntoHour(atMs) < SESSION_MS ? 'active' : 'interlude';
}

/**
 * Progress through the active session, 0..1.
 * Returns 1 during the interlude (the session has completed).
 */
export function sessionProgress(atMs: number): number {
  const into = msIntoHour(atMs);
  if (into >= SESSION_MS) return 1;
  return into / SESSION_MS;
}

/**
 * Milliseconds remaining in the active session.
 * Returns 0 during the interlude.
 */
export function msLeftInSession(atMs: number): number {
  return Math.max(0, SESSION_MS - msIntoHour(atMs));
}

/**
 * The default session. This is what the overwhelming majority of hours are in
 * v1, and what every hour falls back to in v2 when no volunteer is booked.
 */
export function ambientSession(start: Date): Session {
  return {
    hourStart: start,
    kind: 'ambient',
    focusSlug: DEFAULT_FOCUS_SLUG,
    streamUrl: null,
    lighterId: null,
  };
}

/**
 * The shape of a row from the `sessions` table.
 * Kept separate from `Session` so the DB schema can drift without breaking the UI.
 */
export interface SessionRow {
  hour_start: string;
  kind: string;
  focus_slug: string | null;
  stream_url: string | null;
  lighter_id: string | null;
}

/** Map a database row onto the domain type, defaulting anything missing. */
export function sessionFromRow(row: SessionRow): Session {
  return {
    hourStart: new Date(row.hour_start),
    kind: row.kind === 'live' ? 'live' : 'ambient',
    focusSlug: row.focus_slug ?? DEFAULT_FOCUS_SLUG,
    streamUrl: row.stream_url,
    lighterId: row.lighter_id,
  };
}

/**
 * Resolve the session for a moment in time.
 *
 * `lookup` is injected rather than imported so this stays pure and testable —
 * pass the real Supabase query in the app, a stub in tests. In v2 the exact
 * same function returns live sessions with no change to its body.
 */
export async function resolveSession(
  atMs: number,
  lookup: (start: Date) => Promise<SessionRow | null>,
): Promise<Session> {
  const start = hourStart(atMs);
  const row = await lookup(start);
  return row ? sessionFromRow(row) : ambientSession(start);
}

/**
 * A stable string key for the current hour. Used for the heartbeat row and,
 * in v2, the live channel name — so the "room" rolls over on the hour with no
 * cleanup code.
 */
export function hourKey(atMs: number): string {
  return hourStart(atMs).toISOString();
}
