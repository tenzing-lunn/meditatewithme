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
 * One minute to an hour — the stops, written out.
 *
 * Thirteen stops rather than sixty is the point: a slider you drag to roughly
 * the right place, not a number you tune. Nobody sitting down to meditate has
 * an opinion about seventeen minutes versus eighteen.
 *
 * WHY A LIST AND NOT A MIN/MAX/STEP
 * The proposal the client holds promises one minute to forty-five; the build
 * spec said five to sixty. This is the superset that honours both, and the
 * gap from 1 to 5 is not a uniform step, so there is no `step` value that can
 * describe it. An explicit list is the honest representation, and it makes the
 * slider an index into this array rather than a number of minutes.
 *
 * One minute earns its place: it is the sit somebody takes when they are not
 * sure they want to sit at all, which is most first visits.
 */
export const TIMER_STOPS = [
  1, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60,
] as const;

// `noUncheckedIndexedAccess` widens a computed index to `| undefined` even on
// a tuple, so the ends are asserted rather than left to leak through every
// caller. The array is a literal directly above; it cannot be empty.
export const TIMER_MIN_MINUTES: number = TIMER_STOPS[0];
export const TIMER_MAX_MINUTES: number = TIMER_STOPS[TIMER_STOPS.length - 1]!;
export const TIMER_DEFAULT_MINUTES = 10;

const HOUR_MS = 3_600_000;
/** A shared bell needs enough time to be a choice, not an accidental three-minute sit. */
export const SHARED_BELL_MIN_LEAD_MS = 5 * 60_000;

/**
 * The next global bell worth offering.
 *
 * This is absolute server time and stays at the UI boundary. Callers convert
 * its result to the monotonic timer clock exactly once with
 * `monotonicEndAtFromServerTarget()` below.
 */
export function nextSharedBellAt(serverNowMs: number): number {
  const nextHour = Math.floor(serverNowMs / HOUR_MS) * HOUR_MS + HOUR_MS;
  return nextHour - serverNowMs < SHARED_BELL_MIN_LEAD_MS
    ? nextHour + HOUR_MS
    : nextHour;
}

/**
 * Convert one shared, absolute target into a local monotonic deadline.
 *
 * This boundary is deliberately named and singular. Once it returns, all
 * timer maths sees only `performance.now()`-scale values, so an NTP correction
 * or a sleeping laptop cannot move a bell that has already been scheduled.
 */
export function monotonicEndAtFromServerTarget(
  targetServerMs: number,
  serverNowMs: number,
  monotonicNowMs: number,
): number {
  return monotonicNowMs + Math.max(0, targetServerMs - serverNowMs);
}

/**
 * Snap a requested duration to the nearest stop.
 *
 * Anything off-grid — a preference saved under an older range, or a value
 * edited by hand in devtools — lands somewhere the slider can actually
 * represent instead of sitting between two notches.
 *
 * Ties go to the longer sit. Three minutes is equidistant from one and five,
 * and rounding down would cut somebody's sit by two thirds to save them two
 * minutes.
 */
export function clampMinutes(minutes: number): number {
  if (!Number.isFinite(minutes)) return TIMER_DEFAULT_MINUTES;

  let best: number = TIMER_STOPS[0];
  let bestDistance = Infinity;
  for (const stop of TIMER_STOPS) {
    const distance = Math.abs(stop - minutes);
    // <= rather than <, so the later stop wins a tie.
    if (distance <= bestDistance) {
      bestDistance = distance;
      best = stop;
    }
  }
  return best;
}

/**
 * Where a duration sits on the slider.
 *
 * The slider's value is an index, not a number of minutes, because the stops
 * are not evenly spaced. Exported so the control and the clamping logic cannot
 * disagree about which stop a preference means.
 */
export function timerStopIndex(minutes: number): number {
  return TIMER_STOPS.indexOf(clampMinutes(minutes) as (typeof TIMER_STOPS)[number]);
}

/**
 * How a duration is said out loud: "10 minutes", "1 minute", "1 hour".
 *
 * Lives here rather than in the component because it is a fact about the
 * range, and because "1 minutes" is exactly the bug that appears the moment a
 * one-minute stop becomes reachable.
 */
export function durationLabel(minutes: number): { value: string; unit: string } {
  if (minutes === 60) return { value: '1', unit: 'hour' };
  return { value: String(minutes), unit: minutes === 1 ? 'minute' : 'minutes' };
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
