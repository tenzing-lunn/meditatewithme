'use client';

import type { CSSProperties, ReactNode } from 'react';
import { PRIMARY, QUIET, WORD } from './controls';

/**
 * One question, and the way on.
 *
 * Every screen on the rail is this shape: a heading in the rounded face, a
 * line under it, the one control that answers it, and at the foot Back on
 * the left and Next on the right, with Skip as a quiet word beside Next
 * when the question is optional. The foot sits on the safe-area inset so
 * it clears a phone's home indicator; the middle takes the rest of the
 * height and centres what it holds, and scrolls on its own if a question
 * is taller than a short window. The page never scrolls.
 *
 * THE COLUMN IS ANCHORED LEFT, NOT CENTRED
 * A question's measure is still 28rem — a field wider than that is harder
 * to read, not easier — but the column sits at the same left margin as the
 * welcome's title rather than in the middle of the window. On a phone there
 * is no difference; on a laptop it is the difference between a page with a
 * margin and a phone screen floating in a large warm room, and it is what
 * makes the rail read as one page whose content moves rather than as a
 * sequence of small panels. The bowl is the exception, and asks for it with
 * `align="center"`: it is not a question but the object you strike, and the
 * camera lifts away from the middle of the frame.
 *
 * The heading and the control settle upward as the screen arrives (the
 * `screen-settle` keyframes in `globals.css`), sixty milliseconds apart, so
 * a screen reads as arriving rather than switching on.
 */
export default function Screen({
  title,
  titleClassName = 'font-display text-[1.75rem] font-bold leading-[1.15] text-ink sm:text-[2.25rem] lg:text-[2.5rem]',
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
}: {
  title: ReactNode;
  titleClassName?: string;
  lede?: ReactNode;
  children?: ReactNode;
  /** In the frame now. Drives the settle and nothing else. */
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
}) {
  // Only the arrival is animated. A screen sliding out keeps its content, or
  // it would vanish mid-slide.
  const settle = current ? 'screen-settle' : '';
  const column = align === 'center' ? 'mx-auto' : '';
  return (
    <section className="relative flex h-full w-full flex-col overflow-y-auto px-6 pt-[calc(1.25rem+env(safe-area-inset-top))] pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:px-10 md:px-14 lg:px-20 xl:px-24">
      {menu && (
        <div className="absolute top-[calc(0.875rem+env(safe-area-inset-top))] right-4 z-10">
          {menu}
        </div>
      )}

      <div className={`flex w-full max-w-md flex-1 flex-col justify-center py-10 ${column}`}>
        <div className={settle} style={{ '--i': 0 } as CSSProperties}>
          <h2 tabIndex={-1} className={`outline-none ${titleClassName}`}>
            {title}
          </h2>
          {lede && (
            <p className="mt-3 text-base leading-relaxed text-ink-2">{lede}</p>
          )}
        </div>
        {children && (
          <div className={`mt-8 ${settle}`} style={{ '--i': 1 } as CSSProperties}>
            {children}
          </div>
        )}
      </div>

      {(onBack || onNext || onSkip) && (
        <div className={`flex w-full max-w-md items-center justify-between gap-3 ${column}`}>
          {onBack ? (
            <button type="button" onClick={onBack} className={QUIET}>
              {backLabel}
            </button>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-3">
            {onSkip && (
              <button type="button" onClick={onSkip} className={WORD}>
                {skipLabel}
              </button>
            )}
            {onNext && (
              <button
                type="button"
                onClick={onNext}
                disabled={nextDisabled}
                className={PRIMARY}
              >
                {nextLabel}
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
