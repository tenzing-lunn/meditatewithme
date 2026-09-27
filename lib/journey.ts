import type { UserPreferences } from './types';

/**
 * Which screens a person walks, in which order.
 *
 * Pure: the hooks know the facts (signed in, has sat, asked once about their
 * origin), this turns them into the rail. Since Pale water (22 September
 * 2026) there is one screen where a sitting begins, the arrival: the pond,
 * one sentence holding the length, the bell and the sound, and Begin. The
 * rail's time, bell, sound and bowl screens folded into that sentence.
 * Since 27 September 2026 a guest meets two doors first: *By yourself*
 * leads on to the arrival, *Guided meditation* straight into the sitting.
 */

export const SCREENS = ['doors', 'arrive', 'name', 'origin'] as const;

export type Screen = (typeof SCREENS)[number];

export interface JourneyFacts {
  /** Their name comes from the account, so the name screen is skipped. */
  signedIn: boolean;
  /** A completed sitting is in the practice log, on this device or account. */
  hasSat: boolean;
  /** They have been asked where they are from, whatever they answered. */
  originAsked: boolean;
}

/**
 * A guest starts at the two doors, the front page, and *By yourself* leads
 * to the arrival; somebody signed in reaches the arrival through a door on
 * their home.
 *
 * A first visit asks nothing personal: by default nobody sees a name or a
 * place, so they would be an entrance fee with no payoff. The visit after a
 * first completed sitting asks once, after Begin — a guest their name and
 * then their place, a member their place, since the name came with the
 * account — and whatever they answer, including nothing, is the answer from
 * then on. The last question's Next begins the sitting.
 */
export function screensFor(f: JourneyFacts): Screen[] {
  const out: Screen[] = f.signedIn ? ['arrive'] : ['doors', 'arrive'];
  if (f.hasSat && !f.originAsked) {
    if (!f.signedIn) out.push('name');
    out.push('origin');
  }
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
