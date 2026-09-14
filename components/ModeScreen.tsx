'use client';

import type { UserPreferences } from '@/lib/types';
import Screen from './Screen';
import { FOCUS } from './controls';

export type Mode = 'together' | 'alone';

const DOOR =
  `flex min-h-24 w-full flex-col items-start gap-1 rounded-card border bg-surface px-5 py-4 text-left transition-colors duration-200 motion-reduce:transition-none ${FOCUS}`;

/**
 * The two doors: with others, or by yourself.
 *
 * Choosing one is the way on; there is no Next under them. `Doors` is the
 * pair on its own, which the signed-in home also draws, and `ModeScreen`
 * is the pair on the rail with its question over it.
 */
/**
 * What a door writes. Together proposes the shared bell, but only on the way
 * in from By yourself: somebody who sits with others for their own fifteen
 * minutes keeps that, and so keeps their usual, every time they press it.
 */
export function doorPatch(mode: Mode, prefs: UserPreferences): Partial<UserPreferences> {
  if (mode === 'alone') return { showCount: false, untilBell: false };
  return prefs.showCount ? { showCount: true } : { showCount: true, untilBell: true };
}

export function Doors({
  mode,
  bellLabel,
  onChoose,
}: {
  mode: Mode | null;
  /** "12:55", once the clock knows. */
  bellLabel: string | null;
  onChoose: (mode: Mode) => void;
}) {
  const door = (which: Mode) =>
    `${DOOR} ${
      mode === which
        ? 'border-ember'
        : 'border-rule hover:border-ember'
    }`;
  return (
    <div className="flex flex-col gap-3" role="group" aria-label="How to sit">
      <button
        type="button"
        onClick={() => onChoose('together')}
        aria-pressed={mode === 'together'}
        className={door('together')}
      >
        <span className="font-display text-xl font-bold text-ink">With others</span>
        <span className="text-[0.9375rem] leading-snug text-ink-2">
          Sit until the bell{bellLabel ? ` at ${bellLabel}` : ''} with everyone,
          and see them on the earth.
        </span>
      </button>
      <button
        type="button"
        onClick={() => onChoose('alone')}
        aria-pressed={mode === 'alone'}
        className={door('alone')}
      >
        <span className="font-display text-xl font-bold text-ink">By yourself</span>
        <span className="text-[0.9375rem] leading-snug text-ink-2">
          Your own timer, and nobody shown.
        </span>
      </button>
    </div>
  );
}

export default function ModeScreen({
  current,
  mode,
  bellLabel,
  onChoose,
  onBack,
}: {
  current: boolean;
  mode: Mode | null;
  bellLabel: string | null;
  onChoose: (mode: Mode) => void;
  onBack?: () => void;
}) {
  return (
    <Screen
      current={current}
      title="How would you like to sit?"
      onBack={onBack}
    >
      <Doors mode={mode} bellLabel={bellLabel} onChoose={onChoose} />
    </Screen>
  );
}
