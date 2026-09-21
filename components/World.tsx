'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';

import Wordmark from './Wordmark';
import { useWorld } from './useWorld';
import { QUIET } from './controls';

/**
 * The page the map sits on.
 *
 * WHY THE MAP IS LOADED THIS WAY
 * The earth is 273KB and §1 is a page of reasons to be suspicious of weight.
 * `ssr: false` keeps it off the server render and out of every bundle but
 * this route's, so somebody who only ever sits never downloads a byte of it.
 * It is also required rather than merely tidy: the map touches `document`
 * while building its sprites.
 *
 * THE EARTH IS A DUSK PANEL ON THE PAPER
 * The rest of the site is light until the sitting, and the sitting is dusk
 * because candles are lights and a light needs a dark to be seen in. The map
 * keeps that dark, but as one rounded panel on the warm page rather than the
 * whole frame, so this page belongs with the questions and not with the
 * sitting. Nothing readable sits on the earth: the heading is above it and the
 * caption below, on paper, where contrast belongs to the layout and not to
 * whichever ocean or desert is underneath.
 */
const WorldMap = dynamic(() => import('./WorldMap'), {
  ssr: false,
  // Nothing. The panel is already the right darkness and the map arrives when
  // it is ready — a spinner would be the one piece of impatience in a product
  // built out of waiting.
  loading: () => null,
});

export default function World() {
  const { points, placed, loaded } = useWorld();

  return (
    <main className="min-h-dvh bg-paper text-ink">
      <div className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col px-5 pt-[calc(1.25rem+env(safe-area-inset-top))] pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:px-8">
        <header className="flex items-center justify-between gap-4">
          <Wordmark size="sm" />
          <Link href="/" className={QUIET}>
            <svg viewBox="0 0 24 24" className="size-4" fill="none" aria-hidden>
              <path
                d="M15 5 8 12l7 7"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Back
          </Link>
        </header>

        <div className="flex flex-1 flex-col justify-center gap-6 py-10">
          <h1 className="font-display text-[1.75rem] font-bold leading-[1.15] sm:text-[2.25rem]">
            This hour, on the earth
          </h1>

          {/* The map has an aspect of its own, a shade over 2:1, so the panel
              takes that shape rather than filling whatever is left: on a phone
              it is a band, on a laptop it is the width of the column. */}
          <div className="rounded-card bg-dusk p-3 sm:p-4">
            <div className="relative aspect-[2.055] w-full">
              <WorldMap points={points} className="absolute inset-0" />
            </div>
          </div>

          <footer>
            <p className="text-[0.9375rem] font-semibold text-ink-2" role="status">
              {caption(placed, loaded)}
            </p>
            <p className="mt-2 max-w-[46ch] text-[0.8125rem] leading-relaxed text-ink-3">
              {/* Said plainly, on the page itself, rather than only in a privacy
                  notice nobody opens. Somebody looking at a map of where people
                  are is entitled to know how precisely they are on it — and the
                  honest answer, about a hundred kilometres, is also the
                  reassuring one. */}
              Each light is roughly where somebody sat, to within about a hundred
              kilometres. Nobody is asked for their location and none is stored
              more exactly than that.
            </p>
          </footer>
        </div>
      </div>
    </main>
  );
}

/**
 * What the earth is showing.
 *
 * Never a number that was not read. `placed` is null when the endpoint was
 * unreachable, and then this says so rather than reporting an empty world —
 * §10's rule is that everything degrades to something truthful, and "nobody is
 * meditating anywhere on earth" is a much worse thing to say wrongly than
 * "we cannot see".
 */
function caption(placed: number | null, loaded: boolean): string {
  if (!loaded) return 'Finding the hour…';
  if (placed === null) return 'The count is unavailable just now.';
  if (placed === 0) return 'No candle has been lit this hour yet. Yours would be the first.';
  if (placed === 1) return 'One candle is lit this hour.';
  return `${placed} candles are lit this hour.`;
}
