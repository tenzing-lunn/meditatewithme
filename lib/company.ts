/**
 * The one sentence the sitting says about who else is here.
 *
 * Built from two readings that arrive on different clocks: the labels on
 * the earth (`/api/world`, cached ten seconds) and the count (`/api/count`,
 * polled every fifteen). They can disagree for a moment, so the sentence is
 * built to omit rather than contradict: a number that is unavailable is
 * left out, and a number that would go negative is clamped to nothing.
 *
 * Never invents company. With no count and no labels it says nothing.
 */

/** How long one name is shown before the next, when there are several. */
export const LABEL_TURN_MS = 20_000;

export function companyLine(
  labels: readonly string[],
  /** People here now, or null when unknown. */
  count: number | null,
  /** People who have lit this hour, or null. */
  litCount: number | null,
  /** Your own label, so it is never read back to you. */
  own: string | null,
  /** Wall or server time; picks which label is showing. */
  atMs: number,
): string | null {
  const others = own ? withoutOne(labels, own) : [...labels];
  const pick =
    others.length > 0
      ? others[Math.floor(atMs / LABEL_TURN_MS) % others.length]!
      : null;

  if (pick) {
    const rest = count === null ? 0 : Math.max(0, count - 2);
    if (rest === 0) return `${pick} is meditating with you.`;
    return `${pick} and ${rest} ${rest === 1 ? 'other' : 'others'} are meditating with you.`;
  }

  if (count === null) return null;
  const rest = Math.max(0, count - 1);
  if (rest > 0) {
    return rest === 1
      ? '1 other is meditating with you.'
      : `${rest} others are meditating with you.`;
  }
  if (litCount === 1) return 'You are the first here this hour.';
  if (litCount !== null && litCount > 1) {
    const earlier = litCount - 1;
    return `${earlier} ${earlier === 1 ? 'other' : 'others'} sat here earlier this hour.`;
  }
  return null;
}

function withoutOne(labels: readonly string[], drop: string): string[] {
  const out = [...labels];
  const i = out.indexOf(drop);
  if (i >= 0) out.splice(i, 1);
  return out;
}
