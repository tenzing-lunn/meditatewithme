'use client';

import { mmss, remainingMs } from '@/lib/timer';
import Bowl from './Bowl';
import { QUIET_DUSK } from './controls';

export interface Sit {
  /** Its own id, minted at the strike. Carried into the practice log so a
   *  double-fired effect records the same sitting once. */
  id: string;
  /** Monotonic. */
  startedAt: number;
  /** Wall clock, for the practice log. */
  startedAtWall: number;
  /** Monotonic. */
  endsAt: number;
  /** Ends on the shared bell, with everyone else who chose it. */
  together: boolean;
  /** Chose the door marked With others: the earth is shown. */
  withOthers: boolean;
}

/**
 * The sitting. Dusk, the clock small in the corner, and the way out.
 *
 * The earth and the sentence about who is here arrive in the next change;
 * this is the frame they arrive into.
 */
export default function Sitting({
  sit,
  mono,
  onEnd,
}: {
  sit: Sit;
  mono: number;
  onEnd: () => void;
}) {
  const remaining = remainingMs(sit.endsAt, mono);

  return (
    <div className="relative flex h-dvh w-full flex-col bg-dusk text-dusk-ink">
      <p
        role="timer"
        aria-label="Time left"
        className="absolute top-[calc(1rem+env(safe-area-inset-top))] right-5 text-xl tabular-nums text-dusk-ink-2"
      >
        {mmss(remaining)}
      </p>

      <div className="flex flex-1 items-center justify-center px-6">
        {!sit.withOthers && <Bowl dim className="w-full max-w-[14rem]" />}
      </div>

      <div className="flex justify-center gap-3 px-6 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
        <button type="button" onClick={onEnd} className={QUIET_DUSK}>
          End
        </button>
      </div>
    </div>
  );
}
