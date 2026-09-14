import type { UserPreferences } from './types';

/**
 * Which screens a person walks, in which order.
 *
 * Pure: the hooks know the facts (signed in, answered before, asked once
 * about their origin, chose to skip the questions), this turns them into the
 * rail. One question per screen, and the bowl is always last, because the
 * bowl is where a sitting begins and nothing begins one from anywhere else.
 */

export const SCREENS = [
  'welcome',
  'name',
  'origin',
  'mode',
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
  /** This device has struck the bowl before. */
  hasAnswers: boolean;
  /** They have been asked where they are from, whatever they answered. */
  originAsked: boolean;
}

/** Settings, from the menu: the three questions and no bowl. */
export const SETTINGS_SCREENS: readonly Screen[] = ['time', 'bell', 'sound'];

/**
 * A guest walks: welcome, name, origin, with others or by yourself, and
 * then the questions and the bowl. Somebody signed in arrives through a door
 * on their home, so the rail begins at the door and asks their origin once,
 * just after it. "Usual" drops the three questions and keeps the door and
 * the bowl.
 */
export function screensFor(f: JourneyFacts): Screen[] {
  const out: Screen[] = [];
  if (!f.signedIn) {
    out.push('welcome');
    if (!f.hasAnswers) out.push('name', 'origin');
  }
  out.push('mode');
  if (f.signedIn && !f.originAsked) out.push('origin');
  if (!f.usual) out.push('time', 'bell', 'sound');
  out.push('bowl');
  return out;
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
