'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';

import { useWorld } from './useWorld';
import { QUIET } from './controls';

/**
 * The page the globe sits on.
 *
 * WHY THE GLOBE IS LOADED THIS WAY
 * `three` and two NASA textures are about 2MB between them, and §1 is a page of
 * reasons to be suspicious of weight. `ssr: false` keeps all of it off the
 * server render and out of every bundle but this route's, so somebody who only
 * ever sits never downloads a byte of it. It is also required rather than
 * merely tidy: the globe touches `document` while building its sprite, and
 * WebGL does not exist during a server render.
 *
 * WHY THE CAPTION IS NOT ON THE GLOBE
 * Same rule the room follows, for the same reason. Type over a lit planet is
 * type over a photograph — sometimes on ocean, sometimes on a city at night,
 * and it is unreadable at whichever moment it happens to be over the Sahara.
 * So the earth has the middle of the frame and everything readable sits in the
 * dark margin above and below it, where the contrast belongs to the layout
 * rather than to whatever has rotated into view.
 */
const Globe = dynamic(() => import('./Globe'), {
  ssr: false,
  // Nothing. The frame is already the right darkness and the globe fades up
  // when it is ready — a spinner would be the one piece of impatience in a
  // product built out of waiting.
  loading: () => null,
});

export default function World() {
  const { points, placed, loaded } = useWorld();

  return (
    <main className="text-ink relative flex h-dvh flex-col overflow-hidden">
      <header className="relative z-10 flex items-center justify-between gap-4 px-5 pt-5 sm:px-8">
        <Link
          href="/"
          className={QUIET}
        >
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

        <h1 className="font-display text-ink text-lg leading-none">
          This hour, on the earth
        </h1>
      </header>

      {/* The globe takes whatever is left, and it is the only thing in it. */}
      <div className="relative min-h-0 flex-1">
        <Globe points={points} className="absolute inset-0" />
      </div>

      <footer className="relative z-10 px-5 pt-2 pb-7 text-center sm:px-8">
        <p className="text-ink-2 text-sm">{caption(placed, loaded)}</p>
        <p className="text-ink-3 mx-auto mt-2 max-w-[46ch] text-xs leading-relaxed">
          {/* Said plainly, on the page itself, rather than only in a privacy
              notice nobody opens. Somebody looking at a map of where people are
              is entitled to know how precisely they are on it — and the honest
              answer, about a hundred kilometres, is also the reassuring one. */}
          Each light is roughly where somebody sat, to within about a hundred
          kilometres. Nobody is asked for their location and none is stored more
          exactly than that.
        </p>
      </footer>
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
