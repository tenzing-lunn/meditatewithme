'use client';

import { PRIMARY_ROOM, QUIET_ROOM } from './controls';

/** The held beat after the bell, on the earth, before this is shown. */
export const COOLDOWN_MS = 10_000;

/**
 * After the bell: a thing to read, then a thing to choose.
 *
 * The first ten seconds are not here. The bell is still ringing (the tails
 * are 18 to 22 seconds) and the mix is still receding, so the sitting stays
 * on screen with *Come back.* over it (`Sitting`, `ended`) and nothing is
 * said until the tail has gone. Then the minutes at display size, the one
 * fact that says something — who was with you this hour, only for a
 * with-others sitting and only when it is known — and the two ways on. No
 * streak and no total: those are the practice log's, on Home, and the
 * ending is not a scoreboard. Done, or Finish, is the lit one: the sitting
 * is over.
 */
export default function Afterwards({
  minutes,
  withOthers,
  onAgain,
  onDone,
  onFinish,
}: {
  minutes: number;
  /** Everyone who lit this hour, minus you. Null when unknown. */
  withOthers: number | null;
  onAgain: () => void;
  /** Signed in: back home. Absent for a guest, who gets Finish. */
  onDone?: () => void;
  onFinish: () => void;
}) {
  const company =
    withOthers === null
      ? null
      : withOthers === 0
        ? 'Nobody else'
        : `${withOthers} ${withOthers === 1 ? 'other' : 'others'}`;

  return (
    <div className="relative flex h-dvh w-full flex-col items-center justify-center bg-room px-6 text-room-ink">
      <div className="flex w-full max-w-md flex-col items-center screen-settle">
        <p className="font-display text-[3.5rem] font-bold leading-none">
          {minutes} {minutes === 1 ? 'minute' : 'minutes'}.
        </p>

        {company && (
          <dl className="mt-7 w-full max-w-[16rem] text-[0.9375rem]">
            <div className="flex items-baseline justify-between gap-6">
              <dt className="text-room-ink-2">With you this hour</dt>
              <dd className="tabular-nums">{company}</dd>
            </div>
          </dl>
        )}

        <div className="mt-9 flex gap-3">
          <button type="button" onClick={onDone ?? onFinish} className={PRIMARY_ROOM}>
            {onDone ? 'Done' : 'Finish'}
          </button>
          <button type="button" onClick={onAgain} className={QUIET_ROOM}>
            Sit again
          </button>
        </div>
      </div>
    </div>
  );
}
