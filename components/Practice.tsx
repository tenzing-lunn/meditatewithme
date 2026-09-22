'use client';

import {
  humanMinutes,
  recentDays,
  summarise,
  type PracticeEntry,
} from '@/lib/practice';

/**
 * Your practice, at a glance.
 *
 * WHAT THIS IS NOT
 * Not a scoreboard. There is no goal, no target, no badge, and nothing turns
 * red. A meditation practice that makes you feel you are failing at meditation
 * has been made worse by its own progress screen, so the design rule here is
 * that a bad week must look like a quiet grid, never like a warning.
 *
 * That is also why the streak is phrased as days rather than shown as a number
 * with a flame next to it, and why there is no longest streak: a personal
 * best is a scoreboard whoever it is shown to. `summarise` still computes it;
 * nothing here reads it.
 */

/** Thirteen weeks. Long enough to show a habit, short enough to fit a phone. */
const WINDOW_DAYS = 91;

export default function Practice({
  entries,
  now,
}: {
  entries: PracticeEntry[];
  now: number;
}) {
  const s = summarise(entries, now);

  if (s.sittings === 0) {
    return (
      <p className="text-ink-3 max-w-[34ch] text-center text-sm leading-relaxed">
        Your first sitting will show up here.
      </p>
    );
  }

  const days = recentDays(entries, now, WINDOW_DAYS);

  return (
    <div className="flex w-full max-w-sm flex-col items-center gap-5">
      <div className="flex flex-col items-center gap-1">
        <p className="font-display text-2xl font-bold">
          {s.currentStreak > 0 ? (
            <>
              {s.currentStreak}{' '}
              <span className="text-ink-3 font-body text-sm font-normal">
                day{s.currentStreak === 1 ? '' : 's'} in a row
              </span>
            </>
          ) : (
            <span className="text-ink-2 font-body text-base font-normal">
              Begin again whenever you like
            </span>
          )}
        </p>

        {/* ink-2, not ink-3: this line is a fact, not a caption. It stays
            secondary to the streak above it by being a third of its size. */}
        <p className="text-ink-2 text-sm tabular-nums">
          {s.sittings} sitting{s.sittings === 1 ? '' : 's'} ·{' '}
          {humanMinutes(s.totalMinutes)}
        </p>
      </div>

      <Grid days={days} />
    </div>
  );
}

/**
 * Thirteen weeks, a column per week, oldest on the left.
 *
 * The empty days are the point — a grid with its gaps left in is what makes
 * consistency legible, where a list of only the days you turned up would
 * flatter you and answer a different question.
 *
 * Four steps of intensity rather than a continuous scale: nobody can read a
 * gradient, and the difference that matters is "sat / sat a while", not the
 * gap between eighteen and twenty-two minutes.
 */
function Grid({ days }: { days: { key: string; minutes: number }[] }) {
  return (
    <div
      className="flex gap-[3px] overflow-x-auto"
      role="img"
      aria-label={`Practice over the last ${days.length} days: ${
        days.filter((d) => d.minutes > 0).length
      } days sat.`}
    >
      {chunk(days, 7).map((week, i) => (
        <div key={i} className="flex flex-col gap-[3px]">
          {week.map((day) => (
            <div
              key={day.key}
              title={
                day.minutes > 0
                  ? `${day.key} — ${humanMinutes(day.minutes)}`
                  : day.key
              }
              className="h-[9px] w-[9px] rounded-[2px]"
              style={{
                // An empty day is a faint rule, not a hole and not an alarm.
                backgroundColor:
                  day.minutes === 0
                    ? 'var(--color-rule)'
                    : 'var(--color-ember)',
                opacity: intensity(day.minutes),
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

/** 0 → the faint empty tile; then three visible steps. */
function intensity(minutes: number): number {
  if (minutes === 0) return 0.55;
  if (minutes < 15) return 0.45;
  if (minutes < 30) return 0.7;
  return 1;
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}
