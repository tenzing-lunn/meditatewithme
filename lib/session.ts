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

import type { Session } from './types';

export const HOUR_MS = 3_600_000;

/**
 * A session fills its whole hour. There is no gap.
 *
 * It used to run forty-five minutes with a fifteen-minute interlude, which
 * meant the site refused to let anyone sit for a quarter of every hour — and
 * gated a meditation app behind a countdown, which is a strange thing to do to
 * someone who has arrived wanting to meditate.
 *
 * The client's model instead: a candle is lit at the top of every hour and
 * fades across it. Arrive late and you join a candle already burning down; sit
 * long enough and a new one is lit under you. Nobody is ever turned away, and
 * the shared thing is the candle's state rather than permission to begin.
 */
export const SESSION_MINUTES = 60;
export const SESSION_MS = HOUR_MS;

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
 * How far the candle has burned down, 0..1.
 *
 * 0 at the top of the hour when it is lit, approaching 1 just before the next
 * one replaces it. This is the only thing every viewer worldwide shares: two
 * people in different timezones opening the site in the same second see a
 * candle at exactly the same height.
 *
 * That is what makes the hour meaningful without gating anything. Arriving at
 * :50 shows you a candle nearly burned through — you can see you are late
 * without being told you cannot sit.
 */
export function candleBurn(atMs: number): number {
  return msIntoHour(atMs) / HOUR_MS;
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
