import type { UserPreferences } from './types';

/**
 * Which screens a person walks, in which order.
 *
 * Pure: the hooks know the facts (signed in, has sat, asked once about their
 * origin, chose to skip the questions), this turns them into the rail. One
 * question per screen, and the bowl is always last, because the bowl is
 * where a sitting begins and nothing begins one from anywhere else.
 */

export const SCREENS = [
  'mode',
  'name',
  'origin',
  'time',
  'bell',
  'sound',
  'bowl',
] as const;

export type Screen = (typeof SCREENS)[number];

export interface JourneyFacts {
  /** Their name comes from the account, so the name screen is skipped. */
  signedIn: boolean;
  /** "Skip the questions and use these" is on and nothing has changed. */
  usual: boolean;
  /** A completed sitting is in the practice log, on this device or account. */
  hasSat: boolean;
  /** They have been asked where they are from, whatever they answered. */
  originAsked: boolean;
}

/**
 * Everybody starts at the doors: with everyone, or on your own, on this
 * hour's earth. For a guest that screen is the front page — there is no
 * title page before it. Somebody signed in arrives through a door on their
 * home, so their rail begins just past it.
 *
 * A first visit asks nothing personal: by default nobody sees a name or a
 * place, so they would be an entrance fee with no payoff. The visit after a
 * first completed sitting asks once — a guest their name and then their
 * place, a member their place, since the name came with the account — and
 * whatever they answer, including nothing, is the answer from then on.
 * "Usual" drops the three questions and keeps the door and the bowl.
 */
export function screensFor(f: JourneyFacts): Screen[] {
  const out: Screen[] = ['mode'];
  if (f.hasSat && !f.originAsked) {
    if (!f.signedIn) out.push('name');
    out.push('origin');
  }
  if (!f.usual) out.push('time', 'bell', 'sound');
  out.push('bowl');
  return out;
}

export type Mode = 'together' | 'alone';

/**
 * What a door writes. Together proposes the shared bell, but only on the way
 * in from By yourself: somebody who sits with others for their own fifteen
 * minutes keeps that, and so keeps their usual, every time they press it.
 */
export function doorPatch(mode: Mode, prefs: UserPreferences): Partial<UserPreferences> {
  if (mode === 'alone') return { showCount: false, untilBell: false };
  return prefs.showCount ? { showCount: true } : { showCount: true, untilBell: true };
}

/**
 * The line under *Sit with everyone*: what that door leads to, by the rule
 * above. From by yourself it proposes the bell, so the line names it; already
 * with others on a length of your own, the length survives the door, and the
 * line says so rather than promising a bell that will not ring for you.
 */
export function togetherLine(prefs: UserPreferences, bellLabel: string | null): string {
  const next = { ...prefs, ...doorPatch('together', prefs) };
  return next.untilBell
    ? `Everyone finishes together${bellLabel ? ` at ${bellLabel}` : ''}`
    : 'Your own length, with everyone';
}

/** The screen one step along, or null off either end. */
export function step(
  screens: readonly Screen[],
  at: Screen,
  dir: 1 | -1,
): Screen | null {
  const i = screens.indexOf(at);
  if (i < 0) return null;
  return screens[i + dir] ?? null;
}

/**
 * What "nothing has changed" compares. The skip is honoured only while the
 * preferences it was switched on with are still the preferences, so a
 * settings edit or a sync from another device puts the questions back.
 */
export function usualFingerprint(p: UserPreferences): string {
  const beds = Object.entries(p.soundMix)
    .filter(([, v]) => v > 0)
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([k, v]) => `${k}=${v}`)
    .join(',');
  return `${p.timerMinutes}|${p.untilBell}|${p.endBell}|${p.showCount}|${beds}`;
}
