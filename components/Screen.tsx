'use client';

import type { ReactNode } from 'react';
import RailBar from './RailBar';
import { PRIMARY_ROOM_SM, PRIMARY_SM, WORD_SM } from './controls';

/**
 * One question, and the way on.
 *
 * Every screen on the rail is this shape: the bar across the top (`RailBar`:
 * Back, and where you are on the rail), the question in the rounded face, a
 * line under it, the one control that answers it, and Next under that
 * control. The foot is a size down from
 * everything above it: the question is the point, and the way on only needs
 * finding. The page never scrolls; a question taller than a short window
 * scrolls inside this section.
 *
 * THE HEADING HOLDS STILL AND THE FOOT FOLLOWS THE ANSWER
 * Both were wrong until 17 September 2026 and for the same reason: the block
 * was centred in the frame and the foot was pinned to its bottom edge. A
 * two-line lede then pushed the question sixty pixels down the window, so
 * nothing held still from one step to the next but the left margin, and Back
 * and Next floated as much as three hundred pixels below the control they
 * belong to, one hard left and one mid-column. Now the block hangs from a
 * fixed baseline near the top — only the answer grows downward — and the foot
 * sits directly under the answer, at its right edge. Back has been in the bar
 * since 21 September 2026, so the foot is only ever the way forward.
 * The bowl is the exception and asks for it with `align="center"`: it is not
 * a question but the object you strike, and the camera lifts away from the
 * middle of the frame.
 *
 * THE COLUMN IS ANCHORED LEFT, NOT CENTRED
 * A question's measure is still 28rem — a field wider than that is harder to
 * read, not easier — but the column sits at the same left margin as the
 * doors' title rather than in the middle of the window. On a phone there
 * is no difference; on a laptop it is the difference between a page with a
 * margin and a phone screen floating in a large warm room.
 *
 * The arrival itself is the rail's (`rail-enter` in `globals.css`): the
 * whole screen rises into place, so nothing in it animates on its own.
 */
export default function Screen({
  title,
  titleClassName,
  lede,
  children,
  current,
  menu,
  onBack,
  backLabel = 'Back',
  onNext,
  nextLabel = 'Next',
  nextDisabled = false,
  onSkip,
  skipLabel = 'Skip',
  align = 'left',
  bare = false,
  split = false,
  room = false,
  middle = false,
  step,
  steps,
}: {
  title: ReactNode;
  titleClassName?: string;
  lede?: ReactNode;
  children?: ReactNode;
  /** In the frame now. The rail animates the arrival, so nothing here reads it. */
  current: boolean;
  /** Something for the top corner: the menu. */
  menu?: ReactNode;
  onBack?: () => void;
  backLabel?: string;
  onNext?: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  onSkip?: () => void;
  skipLabel?: string;
  /** The bowl centres itself; every question is anchored to the margin. */
  align?: 'left' | 'center';
  /**
   * The answer is the whole screen. The question and its line are still the
   * `h2` the rail focuses and a screen reader is handed, but nobody sees
   * them: a typed answer is a line with its prompt writing itself on it,
   * and the prompt already says what goes there.
   */
  bare?: boolean;
  /**
   * From `md` up, the question and its control side by side: the question in
   * a left column at the margin, never narrower than 17rem so the heading
   * holds to two lines, and the control in a right column up to 34rem, both
   * hanging from the same baseline. A tablet or laptop window otherwise gives
   * a control as rich as the timer dial a phone's width and leaves half the
   * screen empty; this uses the width without making anything larger than it
   * needs to be. `md`, not `lg`, because a browser window on a laptop is often
   * narrower than 1024px. Below `md` it is the ordinary stacked column.
   */
  /** A class string instead of `true` sets the two columns, e.g. a narrow right one. */
  split?: boolean | string;
  /**
   * In the room, dawn or dusk: the heading, its line, the marks and the foot
   * are drawn in the `room-*` tokens. Time, bell, sound and the bowl.
   */
  room?: boolean;
  /**
   * With `split`, the block sits in the middle of the page and the question
   * level with the middle of its control, rather than hanging from the
   * baseline.
   * The time, bell and sound questions, so the three read as one run from a
   * laptop's width up. A phone stacks them from the top as usual.
   */
  middle?: boolean;
  /** This question's place on the rail, 1-based, and how many there are. */
  step?: number;
  steps?: number;
}) {
  const heading =
    titleClassName ??
    `font-display text-[1.75rem] font-bold leading-[1.15] ${
      room ? 'text-room-ink' : 'text-ink'
    } sm:text-[2.25rem] lg:text-[2.5rem]`;
  const centred = align === 'center';
  const foot = onNext || onSkip;

  return (
    <section className="relative flex h-full w-full flex-col overflow-y-auto px-6 pt-[calc(1.25rem+env(safe-area-inset-top))] pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:px-10 md:px-14 lg:px-20 xl:px-24">
      {menu && (
        <div className="absolute top-[calc(0.875rem+env(safe-area-inset-top))] right-4 z-10">
          {menu}
        </div>
      )}

      <RailBar onBack={onBack} backLabel={backLabel} step={step} steps={steps} room={room} />

      <div
        className={`flex w-full flex-1 flex-col pb-8 ${
          // The baseline. Near the top on a laptop so the answer has room to
          // grow under it, and out of the way of the corner on a phone.
          // A bare screen is only its line, so it sits in the middle.
          centred || bare
            ? 'justify-center'
            : middle
              ? 'md:justify-center'
              : 'pt-[clamp(1rem,7vh,5rem)]'
        }`}
      >
        <div
          className={`w-full max-w-md ${centred ? 'mx-auto' : ''} ${
            split
              ? `md:grid md:max-w-6xl ${
                  typeof split === 'string'
                    ? split
                    : 'md:grid-cols-[minmax(17rem,1fr)_minmax(0,34rem)]'
                } ${middle ? 'md:items-center' : 'md:items-start'} md:gap-x-10 lg:gap-x-16`
              : ''
          }`}
        >
          <div>
            <h2 tabIndex={-1} className={`outline-none ${bare ? 'sr-only' : heading}`}>
              {title}
            </h2>
            {lede && (
              <p
                className={
                  bare
                    ? 'sr-only'
                    : `mt-3 max-w-[42ch] text-base leading-relaxed ${
                        room ? 'text-room-ink-2' : 'text-ink-2'
                      }`
                }
              >
                {lede}
              </p>
            )}
          </div>

          <div className={`${bare ? '' : 'mt-8'} ${split ? 'md:mt-0' : ''}`}>
            {children}
            {foot && !bare && (
              <div
                className={`mt-6 flex items-center gap-3 sm:mt-8 ${
                  centred ? 'justify-center' : 'justify-end'
                }`}
              >
                {onSkip && (
                  <button type="button" onClick={onSkip} className={WORD_SM}>
                    {skipLabel}
                  </button>
                )}
                {onNext && (
                  <button
                    type="button"
                    onClick={onNext}
                    disabled={nextDisabled}
                    className={room ? PRIMARY_ROOM_SM : PRIMARY_SM}
                  >
                    {nextLabel}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
