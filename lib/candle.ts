/**
 * The by-yourself candle: how tall a length is, and which length a height is.
 *
 * Pure, so the part that can quietly be wrong — a rim dragged to a height
 * read as the wrong length, the shortest candle vanishing to nothing — is
 * tested rather than looked at. The component only turns a finger into a
 * height and draws.
 *
 * Heights are fractions of the candle's track, measured up from the saucer.
 * The candle is tall in proportion to the minutes, not to the stop's
 * position on the slider, because the candle is a picture of time burning:
 * a 55-minute candle is eleven times the wax of a 5-minute one above its
 * stub. The shortest length still leaves a stub of wax, so a one-minute
 * sit is a candle nearly out rather than no candle at all.
 */

import { TIMER_MAX_MINUTES, TIMER_MIN_MINUTES, clampMinutes } from './timer.ts';

/** The height of the shortest candle, as a fraction of the track. */
export const WAX_STUB = 0.12;

/** How tall the candle for a length stands, from WAX_STUB up to 1. */
export function waxHeight(minutes: number): number {
  const m = clampMinutes(minutes);
  const f = (m - TIMER_MIN_MINUTES) / (TIMER_MAX_MINUTES - TIMER_MIN_MINUTES);
  return WAX_STUB + (1 - WAX_STUB) * f;
}

/** A dragged height kept on the candle: never below the stub, never past the top. */
export function clampHeight(height: number): number {
  if (!Number.isFinite(height)) return WAX_STUB;
  return Math.min(1, Math.max(WAX_STUB, height));
}

/** The length nearest a height, on the timer's own stops. */
export function minutesAtHeight(height: number): number {
  const f = (clampHeight(height) - WAX_STUB) / (1 - WAX_STUB);
  return clampMinutes(TIMER_MIN_MINUTES + f * (TIMER_MAX_MINUTES - TIMER_MIN_MINUTES));
}
