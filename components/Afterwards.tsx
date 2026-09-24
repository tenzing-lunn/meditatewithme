'use client';

import Brand from './Brand';
import { WORD } from './controls';

/** The held beat after the bell, on the water, before this is shown. */
export const COOLDOWN_MS = 10_000;

/**
 * After the bell: a thing to read, then a thing to choose.
 *
 * The first ten seconds are not here. The bell is still ringing (the tails
 * are 18 to 22 seconds) and the mix is still receding, so the sitting stays
 * on screen with *Come back.* over it (`Sitting`, `ended`) and nothing is
 * said until the tail has gone. Then, over the pond — which `Journey` keeps
 * drawing underneath, the others gone and one wide ring still leaving your
 * stone — the minutes in the serif, one line, and the two ways on. No
 * streak and no total: those are the practice log's, on Home, and the
 * ending is not a scoreboard.
 *
 * Pale water, 22 September 2026: "who was with you this hour" is dropped
 * from here, as the wireframe has it; the sitting's own line said it.
 */
export default function Afterwards({
  minutes,
  onAgain,
  onDone,
  onFinish,
}: {
  minutes: number;
  onAgain: () => void;
  /** Signed in: back home. Absent for a guest, who starts over. */
  onDone?: () => void;
  onFinish: () => void;
}) {
  return (
    <div id="main" className="relative flex h-dvh w-full flex-col px-6 text-ink sm:px-14 lg:px-24">
      <header className="pt-[calc(1rem+env(safe-area-inset-top))]">
        <Brand />
      </header>
      <div className="mx-auto mt-[58dvh] flex w-full max-w-md flex-col items-center text-center screen-settle">
        <p className="font-display text-minutes leading-none">
          {minutes} {minutes === 1 ? 'minute' : 'minutes'}.
        </p>
        <p className="mt-4 text-body text-ink-2">The water is still again.</p>
        <div className="mt-8 flex gap-8">
          <button type="button" onClick={onAgain} className={`${WORD} text-ink`}>
            Again
          </button>
          <button type="button" onClick={onDone ?? onFinish} className={WORD}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
