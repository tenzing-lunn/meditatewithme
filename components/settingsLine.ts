import { localTime, sentenceList } from '@/lib/format';
import { durationLabel, nextSharedBellAt } from '@/lib/timer';
import type { UserPreferences } from '@/lib/types';
import { BELLS } from './audio';
import { TRACKS } from './mix';

/**
 * The settings a sitting will use, as one line of words.
 *
 * "10 minutes · singing bowl · in silence" — printed under the thing that
 * starts a sitting, on both surfaces that have one: the circle on Home, and
 * the word on the landing since 9 September 2026 (`plans/flow-audit.md`, item
 * C). It is what makes it defensible not to walk somebody through the
 * questions: they are told exactly what pressing the control above will do,
 * and `Change` is right beside it.
 *
 * Here rather than in `lib/` only because `BELLS` is in `./audio`, which owns
 * an AudioContext. Nothing in this file touches one; it is words about
 * preferences, and both screens must say them identically — the settings rows
 * read the same answers back, so the panel reads as this line unfolded.
 */

/** "Until 12:55" or "10 minutes" — the answer to How long, as words. */
export function durationAnswer(
  prefs: UserPreferences,
  now: number | null,
): string {
  if (prefs.untilBell) {
    return now === null
      ? 'Until the next bell'
      : `Until ${localTime(nextSharedBellAt(now))}`;
  }
  const d = durationLabel(prefs.timerMinutes);
  return `${d.value} ${d.unit}`;
}

/** "in silence" or "rain and wind" — the answer to Sound, as words. */
export function soundAnswer(prefs: UserPreferences): string {
  const on = TRACKS.filter((t) => (prefs.soundMix[t.slug] ?? 0) > 0);
  return on.length === 0
    ? 'in silence'
    : sentenceList(on.map((t) => t.label.toLowerCase()));
}

/** "10 minutes · singing bowl · rain and wind" */
export function settingsLine(
  prefs: UserPreferences,
  now: number | null,
): string {
  const bell = BELLS[prefs.endBell].label.toLowerCase();
  return `${durationAnswer(prefs, now)} · ${bell} · ${soundAnswer(prefs)}`;
}
