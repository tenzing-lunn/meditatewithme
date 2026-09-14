'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';
import { companyLine } from '@/lib/company';
import type { Cell, WorldPoint } from '@/lib/geo';
import { mmss, remainingMs } from '@/lib/timer';
import Bowl from './Bowl';
import { QUIET_DUSK } from './controls';
import type { MASTER_KEY, TrackSlug } from './mix';
import SoundMixer from './SoundMixer';

/**
 * The earth, loaded only here and only when somebody sits with others.
 * `ssr: false` because the map touches `document` while building its
 * sprites, and because none of the geography belongs on the path to the
 * questions.
 */
const WorldMap = dynamic(() => import('./WorldMap'), {
  ssr: false,
  loading: () => null,
});

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
 * The sitting.
 *
 * Dusk. With others: the earth across the frame, every person a candle on
 * it and yours marked, and under it the one sentence about who is here.
 * The clock is small and in the corner, because the earth is the thing.
 * By yourself: the bowl that was struck, faint, and the clock.
 *
 * Sound opens the faders in a light card at the foot; the caller raises the
 * master when it opens, since a first-timer's graph was built silent.
 */
export default function Sitting({
  sit,
  now,
  mono,
  count,
  litCount,
  points,
  you,
  labels,
  ownLabel,
  soundMix,
  onSound,
  onSoundOpen,
  onEnd,
}: {
  sit: Sit;
  now: number | null;
  mono: number;
  count: number | null;
  litCount: number | null;
  points: WorldPoint[];
  you: Cell | null;
  /** Names on the earth right now, from `/api/world`. */
  labels: readonly string[];
  ownLabel: string | null;
  soundMix: Record<string, number>;
  onSound: (slug: TrackSlug | typeof MASTER_KEY, gain: number) => void;
  onSoundOpen: () => void;
  onEnd: () => void;
}) {
  const [soundOpen, setSoundOpen] = useState(false);
  const remaining = remainingMs(sit.endsAt, mono);
  const line = sit.withOthers
    ? companyLine(labels, count, litCount, ownLabel, now ?? Date.now())
    : null;

  return (
    <div className="relative flex h-dvh w-full flex-col bg-dusk text-dusk-ink">
      <p
        role="timer"
        aria-label="Time left"
        className="absolute top-[calc(1rem+env(safe-area-inset-top))] right-5 z-10 text-xl tabular-nums text-dusk-ink-2"
      >
        {mmss(remaining)}
      </p>

      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-6 px-4 pt-14 pb-4">
        {sit.withOthers ? (
          <>
            {/* The earth has an aspect of its own, a shade over 2:1, so it is
                fitted to whichever runs out first: the frame's width, or the
                height left once the caption and the foot have theirs. */}
            <div className="relative aspect-[2.055] max-h-full w-full max-w-[min(100%,calc((100dvh-14rem)*2.055))]">
              <WorldMap points={points} you={you} className="absolute inset-0" />
            </div>
            <p
              className="min-h-6 max-w-md text-center text-[0.9375rem] text-dusk-ink-2"
              aria-live="polite"
            >
              {line ?? ''}
            </p>
          </>
        ) : (
          <Bowl dim className="w-full max-w-[14rem]" />
        )}
      </div>

      {soundOpen && (
        <div className="mx-auto w-full max-w-md px-4 pb-3">
          <div className="rounded-card border border-rule bg-surface p-4 text-ink">
            <SoundMixer soundMix={soundMix} onChange={onSound} compact />
          </div>
        </div>
      )}

      <div className="flex justify-center gap-3 px-6 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
        <button
          type="button"
          onClick={() => {
            if (!soundOpen) onSoundOpen();
            setSoundOpen((v) => !v);
          }}
          aria-expanded={soundOpen}
          className={QUIET_DUSK}
        >
          Sound
        </button>
        <button type="button" onClick={onEnd} className={QUIET_DUSK}>
          End
        </button>
      </div>
    </div>
  );
}
