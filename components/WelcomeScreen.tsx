'use client';

import type { CSSProperties, ReactNode } from 'react';
import Switch from './Switch';
import Wordmark from './Wordmark';
import { PRIMARY_LG } from './controls';

/**
 * The first screen: the name of the thing, the invitation, and the way in.
 *
 * WHY THIS ONE IS NOT A `Screen`
 * Every question on the rail is the same shape — a 28rem column with the
 * question in the middle and its controls pinned to the foot — because a
 * question is a form and a form has a bottom. The welcome is not a question.
 * It is a title page, so it is set like one: anchored to the left margin
 * where reading starts, sized to the window it was opened on, and with the
 * invitation directly under the sentence that makes it. The first version
 * of this screen put *Join a session* alone at the foot of the viewport, a
 * hand's width of empty paper below the words it answered, and a laptop got
 * a phone's column floating in the middle of a large warm page.
 *
 * WHAT MOVES, AND WHAT DOES NOT
 * The line above the wordmark keeps its height whether or not the count has
 * arrived, so nothing shifts under a reader when it does; the number fades
 * in, and the dot beside it breathes rather than blinks — a candle, not a
 * notification. The arrow on the button travels the way the rail travels
 * when it is pressed, which is the only promise the screen makes about what
 * happens next.
 */
export default function WelcomeScreen({
  current,
  count,
  usualLine,
  usual,
  onUsual,
  onJoin,
  menu,
}: {
  current: boolean;
  /** People here now. Null when unknown. */
  count: number | null;
  /** "10 minutes · singing bowl · in silence", once there is one to show. */
  usualLine: string | null;
  usual: boolean;
  onUsual: (next: boolean) => void;
  onJoin: () => void;
  menu?: ReactNode;
}) {
  // Only the arrival is animated, as on every other screen of the rail.
  const settle = current ? 'screen-settle' : '';
  const live = count !== null && count >= 2;

  return (
    <section className="relative flex h-full w-full flex-col overflow-y-auto px-6 pt-[calc(1.25rem+env(safe-area-inset-top))] pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:px-10 md:px-14 lg:px-20 xl:px-24">
      {menu && (
        <div className="absolute top-[calc(0.875rem+env(safe-area-inset-top))] right-4 z-10 sm:right-10 md:right-14 lg:right-20 xl:right-24">
          {menu}
        </div>
      )}

      {/* Left-anchored and vertically centred: the page is mostly air, and
          the air is on the side the eye leaves, not all four sides. */}
      <div className="flex w-full max-w-[46rem] flex-1 flex-col justify-center py-12">
        <div className={settle} style={{ '--i': 0 } as CSSProperties}>
          <p
            className="flex h-6 items-center gap-2 text-[0.9375rem] font-semibold text-ember"
            role="status"
          >
            <span
              className={`flex items-center gap-2 transition-opacity duration-500 motion-reduce:transition-none ${
                live ? 'opacity-100' : 'opacity-0'
              }`}
            >
              <span className="live-dot size-1.5 rounded-full bg-ember" aria-hidden />
              {live ? `${count} people are sitting right now.` : ''}
            </span>
          </p>
          <h2 tabIndex={-1} className="mt-2 outline-none">
            <Wordmark />
          </h2>
        </div>

        <div className={`mt-5 ${settle}`} style={{ '--i': 1 } as CSSProperties}>
          <p className="max-w-[40ch] text-[1.0625rem] leading-relaxed text-pretty text-ink-2 sm:text-[1.125rem] lg:text-[1.1875rem]">
            A session begins at the top of every hour, and everyone in it sits
            together. Join this one, or sit on your own.
          </p>
          <button
            type="button"
            onClick={onJoin}
            className={`group mt-8 ${PRIMARY_LG}`}
          >
            Join a session
            <svg
              viewBox="0 0 24 24"
              className="size-4 transition-transform duration-200 group-hover:translate-x-1 motion-reduce:transition-none"
              fill="none"
              aria-hidden
            >
              <path
                d="M5 12h12.5M12 6l6 6-6 6"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>

        {usualLine && (
          <div
            className={`mt-12 max-w-[26rem] rounded-card border border-rule bg-surface p-5 ${settle}`}
            style={{ '--i': 2 } as CSSProperties}
          >
            <p className="text-[0.8125rem] text-ink-3">Your usual</p>
            <p className="mt-1 text-[0.9375rem] font-semibold text-ink">{usualLine}</p>
            <div className="mt-4">
              <Switch
                checked={usual}
                onChange={onUsual}
                label="Skip the questions next time"
              />
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
