'use client';

import type { ReactNode } from 'react';

import type { Point } from '@/lib/pond';
import Brand from './Brand';
import { FOCUS } from './controls';

/**
 * The front page for a guest: two ways to sit, on the water.
 *
 * *By yourself* is your own length, among the fish — everyone else sitting
 * this hour — and leads on to the arrival's sentence. *Guided meditation*
 * is whoever is live on camera, and starts the sitting in the click (the
 * audio can only be started inside one). Nobody is turned away from it:
 * with nobody live the line under it says so, and the sitting is the
 * water until somebody is.
 *
 * Tenzing, 27 September 2026, after the canvas page *Two ways in · the
 * fish*. The pond is drawn by `Journey`, underneath.
 */
export default function TwoDoors({
  others,
  guide,
  clock,
  menu,
  ready,
  onYourself,
  onGuided,
  onWater,
}: {
  /** Everybody else sitting this hour; null until known. */
  others: number | null;
  /** The line under *Guided meditation*. */
  guide: string;
  clock: string | null;
  menu?: ReactNode;
  /** The clock has been read; a sitting can be timed. */
  ready: boolean;
  onYourself: () => void;
  onGuided: () => void;
  /** A tap on bare water, in client pixels. */
  onWater?: (at: Point) => void;
}) {
  const door = `flex min-h-22 w-full items-center gap-4 rounded-card border border-rule bg-surface/80 px-5 text-left transition-colors duration-200 hover:border-ember disabled:opacity-40 motion-reduce:transition-none sm:w-[25rem] sm:min-h-25 sm:px-6 ${FOCUS}`;

  return (
    <div
      className="relative flex h-full w-full flex-col px-6 pt-[calc(1rem+env(safe-area-inset-top))] pb-[calc(2rem+env(safe-area-inset-bottom))] sm:px-14 lg:px-24"
      onClick={(e) => {
        const hit = e.target as Element;
        if (hit.closest('button, a, input, [role="menu"], [role="dialog"], header, p, h1')) return;
        onWater?.({ x: e.clientX, y: e.clientY });
      }}
    >
      <header className="flex items-center justify-between">
        <Brand />
        <div className="flex items-center gap-3 text-caption text-ink-3">
          {clock && <span className="tabular-nums">{clock}</span>}
          {menu}
        </div>
      </header>

      <div className="mt-auto">
        {others !== null && others > 0 && (
          <p className="mb-3 text-body text-ink-2">Each fish is someone sitting this hour. Touch the water.</p>
        )}
        <h1 className="font-display text-question leading-[1.2] text-ink sm:text-question-lg">
          How would you like to sit?
        </h1>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:gap-5">
          <button type="button" onClick={onYourself} className={door}>
            <FishMark />
            <span className="flex flex-col gap-0.5">
              <span className="text-clock leading-snug text-ink">By yourself</span>
              <span className="text-control text-ink-2">
                {others ? `Your own time, among ${others} ${others === 1 ? 'other' : 'others'}` : 'Your own time'}
              </span>
            </span>
          </button>
          <button type="button" onClick={onGuided} disabled={!ready} className={door}>
            <GuideMark />
            <span className="flex flex-col gap-0.5">
              <span className="text-clock leading-snug text-ink">Guided meditation</span>
              <span className="text-control text-ink-2">{guide}</span>
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

function FishMark() {
  return (
    <svg aria-hidden="true" width="30" height="18" viewBox="-7 -6 24 12" className="shrink-0 text-ink-3">
      <path
        d="M-3.2 0 L-6 -3.3 L-5 0 L-6 3.3 Z M-3.6 0 C-1 -3.3 7 -3.8 13.5 0 C7 3.8 -1 3.3 -3.6 0 Z"
        fill="currentColor"
      />
    </svg>
  );
}

function GuideMark() {
  return (
    <svg aria-hidden="true" width="30" height="18" viewBox="0 0 30 18" fill="none" className="shrink-0 text-ember">
      <rect x="1" y="1" width="28" height="16" rx="4" stroke="currentColor" strokeOpacity="0.6" />
      <circle cx="15" cy="6.6" r="2.1" fill="currentColor" />
      <path d="M9.5 14 C10 10.2 20 10.2 20.5 14 Z" fill="currentColor" />
    </svg>
  );
}
