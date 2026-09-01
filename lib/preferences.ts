/**
 * Preferences: defaults, validation, and the database row mapping.
 *
 * Pure — no React, no I/O. The hooks in components/ do the storing and the
 * fetching; everything about what a valid preference IS lives here.
 *
 * WHY THIS IS ONE MODULE AND NOT TWO
 * Preferences now arrive from two directions: localStorage, where a user can
 * hand-edit them in devtools, and the `preferences` table, which syncs down to
 * every device someone owns. Validating them in two places would mean one of
 * the two paths eventually drifts, and the failure is quiet — a bad `endBell`
 * does nothing at all until the moment a sitting ends, and a bad
 * `timerMinutes` sets a bell somewhere absurd.
 *
 * So both paths funnel through `normalize()`. It never throws and never
 * returns a partial object; anything it cannot make sense of becomes the
 * default for that field alone, so one bad value can't discard the rest.
 */

// Explicit .ts extensions on these three, unlike the type-only imports
// elsewhere in lib/. These are VALUE imports, so they have to resolve at
// runtime, and `node --experimental-strip-types` — which is how tests/ runs —
// does not guess extensions. tsconfig has allowImportingTsExtensions for it.
import {
  DEFAULT_BELL,
  MASTER_KEY,
  isBellKind,
  isTrackSlug,
  type BellKind,
  type UserPreferences,
} from './types.ts';
import { TIMER_DEFAULT_MINUTES, clampMinutes } from './timer.ts';
import { DEFAULT_FOCUS_SLUG } from './session.ts';

export const DEFAULT_PREFERENCES: UserPreferences = {
  timerMinutes: TIMER_DEFAULT_MINUTES,
  untilBell: false,
  endBell: DEFAULT_BELL,
  focusSlug: DEFAULT_FOCUS_SLUG,
  soundMix: {},
  showCount: true,
};

/**
 * Gains outside 0..1 would be applied straight to an AudioNode.
 *
 * Unknown keys are dropped rather than carried. A track renamed or removed
 * would otherwise leave its level in everybody's localStorage and in the
 * `sound_mix` column forever, syncing between devices, controlling nothing.
 */
function normalizeMix(v: unknown): Record<string, number> {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return {};
  const out: Record<string, number> = {};
  for (const [slug, gain] of Object.entries(v as Record<string, unknown>)) {
    if (!isTrackSlug(slug) && slug !== MASTER_KEY) continue;
    const n = Number(gain);
    if (Number.isFinite(n)) out[slug] = Math.min(1, Math.max(0, n));
  }
  return out;
}

/** Coerce anything at all into a complete, valid set of preferences. */
export function normalize(v: unknown): UserPreferences {
  if (!v || typeof v !== 'object') return DEFAULT_PREFERENCES;
  const p = v as Partial<UserPreferences>;

  return {
    timerMinutes: clampMinutes(Number(p.timerMinutes)),
    untilBell: p.untilBell === true,
    endBell: isBellKind(p.endBell) ? p.endBell : DEFAULT_BELL,
    focusSlug:
      typeof p.focusSlug === 'string' && p.focusSlug
        ? p.focusSlug
        : DEFAULT_FOCUS_SLUG,
    soundMix: normalizeMix(p.soundMix),
    // Defaults to shown: only an explicit false turns the count off, so a
    // missing field doesn't quietly opt somebody out of the one feature that
    // makes the site feel inhabited.
    showCount: p.showCount !== false,
  };
}

/** JSON from localStorage. Corrupt or absent both give defaults. */
export function parsePreferences(raw: string | null): UserPreferences {
  if (!raw) return DEFAULT_PREFERENCES;
  try {
    return normalize(JSON.parse(raw));
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

/**
 * A row of the `preferences` table. snake_case, like the database.
 *
 * Kept separate from `UserPreferences` for the same reason `SessionRow` is
 * kept separate from `Session`: the schema can gain a column without the UI
 * type changing shape.
 */
export interface PreferencesRow {
  user_id: string;
  timer_minutes: number;
  until_bell: boolean | null;
  end_bell: string;
  focus_slug: string | null;
  sound_mix: unknown;
  show_count: boolean | null;
}

export function toRow(userId: string, p: UserPreferences): PreferencesRow {
  return {
    user_id: userId,
    timer_minutes: p.timerMinutes,
    until_bell: p.untilBell,
    end_bell: p.endBell,
    focus_slug: p.focusSlug,
    sound_mix: p.soundMix,
    show_count: p.showCount,
  };
}

export function fromRow(row: PreferencesRow): UserPreferences {
  // Straight through normalize: the database has CHECK constraints on
  // timer_minutes and end_bell, but focus_slug and sound_mix are unconstrained,
  // and a row written by an older version of the app is not bound by today's
  // constraints anyway.
  return normalize({
    timerMinutes: row.timer_minutes,
    untilBell: row.until_bell ?? undefined,
    endBell: row.end_bell as BellKind,
    focusSlug: row.focus_slug ?? undefined,
    soundMix: row.sound_mix,
    showCount: row.show_count ?? undefined,
  });
}

/**
 * Whether two sets of preferences differ.
 *
 * The sync loop pushes on every change and pulls on every sign-in. Without
 * this, pulling a row sets state, which looks like a change, which pushes the
 * identical row straight back up — a write per sign-in, forever.
 */
export function samePreferences(a: UserPreferences, b: UserPreferences): boolean {
  return (
    a.timerMinutes === b.timerMinutes &&
    a.untilBell === b.untilBell &&
    a.endBell === b.endBell &&
    a.focusSlug === b.focusSlug &&
    a.showCount === b.showCount &&
    JSON.stringify(a.soundMix) === JSON.stringify(b.soundMix)
  );
}
