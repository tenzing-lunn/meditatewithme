'use client';

import type { ReactNode } from 'react';
import { currentStreak, summarise, type PracticeEntry } from '@/lib/practice';
import { PRIMARY, QUIET_DUSK } from './controls';

/** The held beat after the bell, before anything is said. */
export const COOLDOWN_MS = 10_000;

/**
 * After the bell: a pause, then a thing to read, then a thing to choose.
 *
 * The bell is still ringing for the first ten seconds (the tails are 18 to
 * 22 seconds) and the mix is still receding, so nothing is said: one word
 * and a number counting down, small, so it reads as a pause rather than as
 * being timed. Then the minutes at display size, the facts that say
 * something as a table with no lines in it, and the two ways on. Only rows
 * that say something: a streak of one is the sitting just finished, and a
 * missing count is left out rather than guessed at.
 */
export default function Afterwards({
  minutes,
  withOthers,
  endedAt,
  mono,
  entries,
  now,
  onAgain,
  onDone,
  onFinish,
  offer,
}: {
  minutes: number;
  /** Everyone who lit this hour, minus you. Null when unknown. */
  withOthers: number | null;
  /** Monotonic, at the bell. */
  endedAt: number;
  mono: number;
  entries: PracticeEntry[];
  now: number;
  onAgain: () => void;
  /** Signed in: back home. Absent for a guest, who gets Finish. */
  onDone?: () => void;
  onFinish: () => void;
  /** The account offer, for guests. */
  offer?: ReactNode;
}) {
  const left = Math.max(0, Math.ceil((COOLDOWN_MS - (mono - endedAt)) / 1000));
  const holding = mono - endedAt < COOLDOWN_MS;

  const streak = currentStreak(entries, now);
  const total = summarise(entries, now);
  const rows: [string, string][] = [];
  if (streak > 1) rows.push(['Days in a row', String(streak)]);
  if (withOthers !== null)
    rows.push([
      'With you this hour',
      withOthers === 0 ? 'Nobody else' : `${withOthers} ${withOthers === 1 ? 'other' : 'others'}`,
    ]);
  if (total.sittings > 1) rows.push(['Altogether', `${total.sittings} sittings`]);

  return (
    <div className="relative flex h-dvh w-full flex-col items-center justify-center bg-dusk px-6 text-dusk-ink">
      {holding ? (
        <div className="flex flex-col items-center" role="status" aria-label="Coming back">
          <p className="font-display text-[2.25rem] font-bold leading-none sm:text-[3rem]">
            Come back.
          </p>
          <p aria-hidden className="mt-5 text-lg tabular-nums text-dusk-ink-2">
            {left}
          </p>
        </div>
      ) : (
        <div className="flex w-full max-w-md flex-col items-center screen-settle">
          <p className="font-display text-[3.5rem] font-bold leading-none">
            {minutes} {minutes === 1 ? 'minute' : 'minutes'}.
          </p>

          {rows.length > 0 && (
            <dl className="mt-7 w-full max-w-[16rem] space-y-2 text-[0.9375rem]">
              {rows.map(([label, value]) => (
                <div key={label} className="flex items-baseline justify-between gap-6">
                  <dt className="text-dusk-ink-2">{label}</dt>
                  <dd className="tabular-nums">{value}</dd>
                </div>
              ))}
            </dl>
          )}

          <div className="mt-9 flex gap-3">
            <button type="button" onClick={onAgain} className={PRIMARY}>
              Sit again
            </button>
            <button type="button" onClick={onDone ?? onFinish} className={QUIET_DUSK}>
              {onDone ? 'Done' : 'Finish'}
            </button>
          </div>
        </div>
      )}

      {!holding && offer && (
        <div className="absolute inset-x-0 bottom-0 flex justify-center px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
          {offer}
        </div>
      )}
    </div>
  );
}
