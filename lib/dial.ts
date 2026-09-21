/**
 * The timer dial: which stops it turns through, and where each one sits.
 *
 * Pure, so the part of the dial that can quietly be wrong — an angle read as
 * the wrong stop, the hand leaping from the end back to the start as a finger
 * crosses twelve o'clock — is tested rather than looked at. The component
 * only turns a pointer into an angle and draws.
 *
 * The arc runs clockwise from DIAL_START to DIAL_END, degrees from twelve
 * o'clock, like a kitchen timer's face; the gap at the top is where the two
 * ends would otherwise meet. Stops are spaced evenly along it by position,
 * not by minutes, the same way the slider's stops are.
 */

export const DIAL_START = 20;
export const DIAL_END = 340;

export interface DialStop {
  /** Minutes, or for the bell the minutes until it; null while the clock is unknown. */
  minutes: number | null;
  bell: boolean;
}

/**
 * Every length, with the shared bell placed where it falls in time.
 *
 * Twelve minutes before the bell, the dial reads 1, 5, 10, the bell, 15… so
 * turning it is turning through time in order. A bell exactly as long as a
 * stop comes before that stop; a bell further off than every stop, or not
 * yet known, comes last.
 */
export function joinStops(
  lengths: readonly number[],
  minutesToBell: number | null,
): DialStop[] {
  const out: DialStop[] = [];
  let placed = false;
  for (const minutes of lengths) {
    if (!placed && minutesToBell !== null && minutes >= minutesToBell) {
      out.push({ minutes: minutesToBell, bell: true });
      placed = true;
    }
    out.push({ minutes, bell: false });
  }
  if (!placed) out.push({ minutes: minutesToBell, bell: true });
  return out;
}

/** Where stop `index` of `count` sits, in degrees clockwise from twelve. */
export function stopAngle(index: number, count: number): number {
  if (count <= 1) return DIAL_START;
  return DIAL_START + (index * (DIAL_END - DIAL_START)) / (count - 1);
}

/**
 * Degrees clockwise from twelve o'clock, in [0, 360), for a point given
 * relative to the dial's centre with y pointing down, as on a screen.
 */
export function angleOf(dx: number, dy: number): number {
  const a = (Math.atan2(dx, -dy) * 180) / Math.PI;
  return a < 0 ? a + 360 : a;
}

/**
 * Where the hand is drawn while a finger holds it: the finger's own angle, on
 * the arc. In the gap at the top it waits at whichever end it was nearer to,
 * so crossing twelve o'clock never sweeps it round the whole face.
 */
export function clampToArc(angle: number, previous: number): number {
  if (angle >= DIAL_START && angle <= DIAL_END) return angle;
  return previous >= (DIAL_START + DIAL_END) / 2 ? DIAL_END : DIAL_START;
}

/**
 * The stop nearest an angle.
 *
 * In the gap at the top the hand stays at whichever end it was nearer, so a
 * finger dragged past the end holds it there instead of flinging it round
 * to the start.
 */
export function stopAt(angle: number, count: number, previous: number): number {
  if (count <= 1) return 0;
  if (angle < DIAL_START || angle > DIAL_END) {
    return previous >= (count - 1) / 2 ? count - 1 : 0;
  }
  const i = Math.round(((angle - DIAL_START) * (count - 1)) / (DIAL_END - DIAL_START));
  return Math.min(count - 1, Math.max(0, i));
}
