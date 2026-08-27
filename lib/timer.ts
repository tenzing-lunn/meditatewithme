/**
 * The personal timer.
 *
 * Deliberately separate from the session clock in lib/clock.ts. They measure
 * different things and conflating them is, per the architecture notes, the most
 * likely source of confusing bugs here:
 *
 *   session clock   absolute, shared, corrected against the server
 *   personal timer  relative, private, monotonic
 *
 * Everything below is pure — the caller passes the current reading in. In the
 * app that reading comes from `performance.now()`, which is monotonic and so
 * cannot be dragged around by an NTP correction landing mid-sit. Using
 * `Date.now()` here would mean a clock adjustment could move somebody's bell.
 *
 * Note what is NOT here: any counting. Browsers throttle background timers to
 * roughly one tick a minute, and meditating with the tab hidden is the normal
 * case rather than the exception. So we store the target and derive the
 * remainder, which self-corrects after any sleep, throttle or tab switch.
 */

/**
 * Five minutes to an hour, in five-minute steps — the client's call.
 *
 * Twelve stops rather than sixty is the point: a slider you drag to roughly the
 * right place, not a number you tune. Nobody sitting down to meditate has an
 * opinion about seventeen minutes versus eighteen.
 */
export const TIMER_MIN_MINUTES = 5;
export const TIMER_MAX_MINUTES = 60;
export const TIMER_STEP_MINUTES = 5;
export const TIMER_DEFAULT_MINUTES = 10;

/**
 * Snap a requested duration to a valid stop.
 *
 * Rounds to the step as well as clamping to the range, so a value that arrives
 * off-grid — an old preference saved when the range was 1–45, or something
 * edited by hand in devtools — lands somewhere the slider can actually
 * represent instead of sitting between two notches.
 */
export function clampMinutes(minutes: number): number {
  if (!Number.isFinite(minutes)) return TIMER_DEFAULT_MINUTES;
  const snapped = Math.round(minutes / TIMER_STEP_MINUTES) * TIMER_STEP_MINUTES;
  return Math.min(TIMER_MAX_MINUTES, Math.max(TIMER_MIN_MINUTES, snapped));
}

/** When a sit started now would end, on the same monotonic scale. */
export function endsAt(startedAt: number, minutes: number): number {
  return startedAt + clampMinutes(minutes) * 60_000;
}

/** Milliseconds left. Never negative, so callers can render it directly. */
export function remainingMs(end: number, now: number): number {
  return Math.max(0, end - now);
}

export function hasEnded(end: number, now: number): boolean {
  return now >= end;
}

/**
 * Progress through the sit, 0..1.
 *
 * Guards a zero duration rather than returning NaN — a NaN here would reach a
 * style attribute and silently break the layout instead of throwing.
 */
export function timerProgress(
  startedAt: number,
  end: number,
  now: number,
): number {
  const total = end - startedAt;
  if (total <= 0) return 1;
  return Math.min(1, Math.max(0, (now - startedAt) / total));
}

/**
 * m:ss for a duration. Shared with the session clock so the two read as one
 * design rather than two implementations that happen to look similar.
 *
 * Rounds up, so a timer shows 1:00 for the whole final minute and reaches 0:00
 * exactly when it is done — counting down through 0:59 while a minute remains
 * feels like being cheated of a second.
 */
export function mmss(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}
